-- ════════════════════════════════════════════════════════════════════════════
-- FishPulse — fishing_spots
-- Run with `supabase db push`, or paste into Dashboard → SQL Editor → Run.
-- Idempotent where practical so it can be re-run during the hackathon.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create table if not exists public.fishing_spots (
  id              uuid primary key default gen_random_uuid(),
  latitude        double precision not null check (latitude between -90 and 90),
  longitude       double precision not null check (longitude between -180 and 180),
  username        text not null check (char_length(btrim(username)) between 1 and 24),
  fish_type       text not null check (char_length(btrim(fish_type)) between 1 and 40),
  activity_level  text not null check (activity_level in ('low', 'medium', 'high')),
  note            text check (note is null or char_length(note) <= 140),
  is_approximate  boolean not null default true,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '30 minutes'),
  -- Ownership. Set by trigger from the JWT; never trusted from the client.
  creator_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  constraint fishing_spots_expiry_window check (
    expires_at > created_at and expires_at <= created_at + interval '6 hours'
  )
);

comment on table public.fishing_spots is
  'Community-reported fishing activity. Unverified user reports; time-limited via expires_at.';
comment on column public.fishing_spots.latitude is
  'The coordinate the user CHOSE to publish (possibly coarsened client-side). No hidden precise location is stored.';

-- Active-report reads: WHERE expires_at > now() ORDER BY created_at DESC
create index if not exists fishing_spots_expires_at_idx on public.fishing_spots (expires_at desc);
create index if not exists fishing_spots_created_at_idx on public.fishing_spots (created_at desc);
-- Rate-limit lookups
create index if not exists fishing_spots_creator_recent_idx on public.fishing_spots (creator_id, created_at desc);

-- ─── Server-owned fields + basic abuse mitigation ───────────────────────────
create or replace function public.fishing_spots_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
  requested_ttl interval;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- The client cannot forge identity or timestamps.
  new.creator_id := auth.uid();
  new.created_at := now();

  -- Clamp lifetime to [5 min, 6 h]; default 30 min.
  requested_ttl := coalesce(new.expires_at - now(), interval '30 minutes');
  new.expires_at := now() + least(greatest(requested_ttl, interval '5 minutes'), interval '6 hours');

  new.username  := btrim(new.username);
  new.fish_type := btrim(new.fish_type);
  new.note      := nullif(btrim(new.note), '');

  -- Simple per-user rate limit: max 5 reports per rolling minute.
  -- (Anonymous users can mint new identities, so a public launch also needs
  --  IP-level limits / CAPTCHA at the edge — see README "Known limitations".)
  select count(*) into recent_count
  from public.fishing_spots
  where creator_id = new.creator_id
    and created_at > now() - interval '1 minute';
  if recent_count >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists fishing_spots_before_insert on public.fishing_spots;
create trigger fishing_spots_before_insert
  before insert on public.fishing_spots
  for each row execute function public.fishing_spots_before_insert();

-- ─── Row Level Security ─────────────────────────────────────────────────────
alter table public.fishing_spots enable row level security;

-- Anyone (guest or anonymous-authenticated) can read ACTIVE reports only.
-- This policy also gates which rows Realtime delivers to each client.
drop policy if exists "Active spots are readable" on public.fishing_spots;
create policy "Active spots are readable"
  on public.fishing_spots
  for select
  to anon, authenticated
  using (expires_at > now());

-- Signed-in users (incl. anonymous sign-ins) may insert under their own identity.
drop policy if exists "Users insert own spots" on public.fishing_spots;
create policy "Users insert own spots"
  on public.fishing_spots
  for insert
  to authenticated
  with check (creator_id = auth.uid());

-- No UPDATE / DELETE policies: nobody can modify or remove anyone's reports
-- from the client (including their own) in the MVP.
revoke update, delete, truncate on public.fishing_spots from anon, authenticated;

-- ─── Realtime ───────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fishing_spots'
  ) then
    alter publication supabase_realtime add table public.fishing_spots;
  end if;
end;
$$;

-- ─── Optional housekeeping ──────────────────────────────────────────────────
-- Expired rows are already invisible through RLS. To physically delete them,
-- enable the pg_cron extension (Dashboard → Database → Extensions) and run:
--
--   select cron.schedule('fishpulse-purge-expired', '*/15 * * * *',
--     $$delete from public.fishing_spots where expires_at < now() - interval '1 day'$$);
