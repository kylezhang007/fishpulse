-- ════════════════════════════════════════════════════════════════════════════
-- FishPulse — Phase A: profiles, shared invite code, member-only posting
-- Paste into Dashboard → SQL Editor → Run (after the fishing_spots migration).
-- Re-runnable.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Invite codes (server-side only: no client can read this table) ─────────
create table if not exists public.invite_codes (
  code        text primary key,
  max_uses    integer not null check (max_uses >= 0),
  used_count  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.invite_codes enable row level security;
revoke all on public.invite_codes from anon, authenticated;

-- Seed your member code (kept out of git; see CODES.local.md):
--   insert into public.invite_codes (code, max_uses) values ('<MEMBER_INVITE_CODE>', 25) on conflict (code) do nothing;

-- ─── Profiles (public, one per auth user) ───────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(btrim(display_name)) between 2 and 20),
  role          text not null check (role in ('guest', 'member')),
  avatar_color  text not null default '#3fb2ff' check (avatar_color ~ '^#[0-9a-fA-F]{6}$'),
  created_at    timestamptz not null default now()
);
create unique index if not exists profiles_display_name_unique on public.profiles (lower(btrim(display_name)));

alter table public.profiles enable row level security;
drop policy if exists "Profiles are public" on public.profiles;
create policy "Profiles are public" on public.profiles for select to anon, authenticated using (true);
-- No insert/update/delete policies: profiles change only through the functions below.
revoke insert, update, delete, truncate on public.profiles from anon, authenticated;

-- Realtime so other clients learn new names/avatars.
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end;
$$;

-- ─── Functions ──────────────────────────────────────────────────────────────
create or replace function public.is_name_available(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
    where lower(btrim(display_name)) = lower(btrim(p_name))
      and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  );
$$;

-- Guest: auto name "Guest-1234". Idempotent — returns the existing profile if any.
create or replace function public.register_guest(p_color text default '#9aa6bb')
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles;
  candidate text;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into me from public.profiles where id = auth.uid();
  if found then return me; end if;
  loop
    candidate := 'Guest-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when public.is_name_available(candidate);
  end loop;
  insert into public.profiles (id, display_name, role, avatar_color)
  values (auth.uid(), candidate, 'guest', p_color)
  returning * into me;
  return me;
end;
$$;

-- Member: needs the shared invite code + a unique name. Upgrades a guest in place.
-- Errors: invalid_code | code_full | name_taken | name_invalid
create or replace function public.register_member(p_code text, p_name text, p_color text default '#3fb2ff')
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles;
  inv public.invite_codes;
  clean_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into me from public.profiles where id = auth.uid();
  if found and me.role = 'member' then return me; end if;   -- already a member: no code consumed

  if char_length(clean_name) < 2 or char_length(clean_name) > 20 or clean_name ~* '^guest-' then
    raise exception 'name_invalid' using errcode = 'P0001';
  end if;
  if not public.is_name_available(clean_name) then
    raise exception 'name_taken' using errcode = 'P0001';
  end if;

  select * into inv from public.invite_codes where code = upper(btrim(p_code)) for update;
  if not found or not inv.active then raise exception 'invalid_code' using errcode = 'P0001'; end if;
  if inv.used_count >= inv.max_uses then raise exception 'code_full' using errcode = 'P0001'; end if;

  update public.invite_codes set used_count = used_count + 1 where code = inv.code;

  insert into public.profiles (id, display_name, role, avatar_color)
  values (auth.uid(), clean_name, 'member', coalesce(p_color, '#3fb2ff'))
  on conflict (id) do update
    set display_name = excluded.display_name, role = 'member', avatar_color = excluded.avatar_color
  returning * into me;
  return me;
end;
$$;

-- Public stats for a profile (counts include expired reports, which RLS hides from clients).
create or replace function public.profile_stats(p_id uuid)
returns table (reports_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.fishing_spots where creator_id = p_id;
$$;

revoke all on function public.register_guest(text) from public, anon;
revoke all on function public.register_member(text, text, text) from public, anon;
grant execute on function public.register_guest(text) to authenticated;
grant execute on function public.register_member(text, text, text) to authenticated;
grant execute on function public.is_name_available(text) to anon, authenticated;
grant execute on function public.profile_stats(uuid) to anon, authenticated;

-- ─── Only members may post hotspots ─────────────────────────────────────────
drop policy if exists "Users insert own spots" on public.fishing_spots;
drop policy if exists "Members insert own spots" on public.fishing_spots;
create policy "Members insert own spots"
  on public.fishing_spots
  for insert
  to authenticated
  with check (
    creator_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'member')
  );

-- ─── Admin cheat-sheet ──────────────────────────────────────────────────────
-- Change / disable the code:
--   update public.invite_codes set active = false where code = '<MEMBER_INVITE_CODE>';
--   insert into public.invite_codes (code, max_uses) values ('NEWCODE', 25);
-- See usage:  select code, used_count, max_uses, active from public.invite_codes;
-- Members:    select display_name, role, created_at from public.profiles order by created_at;
