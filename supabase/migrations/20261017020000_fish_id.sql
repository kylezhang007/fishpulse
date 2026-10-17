-- ════════════════════════════════════════════════════════════════════════════
-- FishPulse — Phase B: Fish ID (Fishial.ai) + catch cards
-- Paste into Dashboard → SQL Editor → Run. Re-runnable.
-- Writes happen only in the `identify-fish` Edge Function (service role).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Catch cards ────────────────────────────────────────────────────────────
create table if not exists public.catches (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  card_no             integer not null,
  species_common      text not null,
  species_scientific  text,
  icon_species        text check (icon_species in ('Bass', 'Trout', 'Salmon', 'Catfish')),
  certainty           real check (certainty between 0 and 1),
  photo_path          text,
  place_name          text check (place_name is null or char_length(place_name) <= 120),
  wiki_url            text,
  is_public           boolean not null default true,
  caught_at           timestamptz not null default now(),
  created_at          timestamptz not null default now()
);
create index if not exists catches_user_created_idx on public.catches (user_id, created_at desc);

alter table public.catches enable row level security;
drop policy if exists "Catches are readable" on public.catches;
create policy "Catches are readable" on public.catches
  for select to anon, authenticated using (is_public or user_id = auth.uid());
revoke insert, update, delete, truncate on public.catches from anon, authenticated;

-- ─── Fish ID usage log (for monthly quotas) ────────────────────────────────
create table if not exists public.fish_id_requests (
  id          bigserial primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  outcome     text not null check (outcome in ('ok', 'no_fish', 'error')),
  created_at  timestamptz not null default now()
);
create index if not exists fish_id_requests_user_idx on public.fish_id_requests (user_id, created_at desc);
alter table public.fish_id_requests enable row level security;
revoke all on public.fish_id_requests from anon, authenticated;

-- ─── Tunable limits (edit these rows to change quotas) ─────────────────────
create table if not exists public.app_settings (key text primary key, value integer not null);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
insert into public.app_settings (key, value) values
  ('fishid_member_monthly', 5),     -- per member per calendar month (UTC)
  ('fishid_global_monthly', 180)    -- whole site per month; Fishial plan = 200 credits
on conflict (key) do nothing;

-- Remaining identifications for the caller this month (admins: unlimited).
create or replace function public.fishid_quota()
returns table (role text, used integer, per_user_limit integer, remaining integer, unlimited boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r text;
  month_start timestamptz := date_trunc('month', now() at time zone 'utc') at time zone 'utc';
  u integer;
  g integer;
  lim integer;
  glim integer;
begin
  select p.role into r from public.profiles p where p.id = auth.uid();
  select count(*) into u from public.fish_id_requests where user_id = auth.uid() and created_at >= month_start and outcome <> 'error';
  select count(*) into g from public.fish_id_requests where created_at >= month_start and outcome <> 'error';
  select value into lim from public.app_settings where key = 'fishid_member_monthly';
  select value into glim from public.app_settings where key = 'fishid_global_monthly';
  return query select
    coalesce(r, 'guest'),
    u,
    coalesce(lim, 5),
    case when r = 'admin' then null
         when r = 'member' then greatest(0, least(coalesce(lim, 5) - u, coalesce(glim, 180) - g))
         else 0 end,
    r = 'admin';
end;
$$;
revoke all on function public.fishid_quota() from public, anon;
grant execute on function public.fishid_quota() to authenticated;

-- ─── Photo storage (public read; only the Edge Function writes) ────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catch-photos', 'catch-photos', true, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Admin: clear catch cards too (photos stay in storage; delete the bucket folder to remove them).
--   delete from public.catches;
-- Reset this month's quotas:  delete from public.fish_id_requests where created_at >= date_trunc('month', now());
