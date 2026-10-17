-- ════════════════════════════════════════════════════════════════════════════
-- FishPulse — admin account + one-click clear
-- Paste into Dashboard → SQL Editor → Run (after the profiles migration). Re-runnable.
-- ════════════════════════════════════════════════════════════════════════════

-- Roles: guest | member | admin
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('guest', 'member', 'admin'));

-- Admins share the fixed name "kylezhang" across devices, so uniqueness applies to non-admins only.
drop index if exists public.profiles_display_name_unique;
create unique index if not exists profiles_display_name_unique_nonadmin
  on public.profiles (lower(btrim(display_name))) where role <> 'admin';

-- Invite codes can grant member or admin.
alter table public.invite_codes add column if not exists grants_role text not null default 'member';
alter table public.invite_codes drop constraint if exists invite_codes_grants_role_check;
alter table public.invite_codes add constraint invite_codes_grants_role_check check (grants_role in ('member', 'admin'));

-- Admin code: up to 5 devices.
-- Seed your admin code (kept out of git; see CODES.local.md):
--   insert into public.invite_codes (code, max_uses, grants_role) values ('<ADMIN_CODE>', 5, 'admin')
--   on conflict (code) do update set grants_role = 'admin';

-- "kylezhang" is reserved for the admin.
create or replace function public.is_name_available(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(btrim(p_name)) <> 'kylezhang'
    and not exists (
      select 1 from public.profiles
      where role <> 'admin'
        and lower(btrim(display_name)) = lower(btrim(p_name))
        and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    );
$$;

-- Same signature as before; now handles admin codes (no name needed) first.
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
  if found and me.role = 'admin' then return me; end if;

  select * into inv from public.invite_codes where code = upper(btrim(p_code)) for update;
  if not found or not inv.active then raise exception 'invalid_code' using errcode = 'P0001'; end if;

  if inv.grants_role = 'admin' then
    if inv.used_count >= inv.max_uses then raise exception 'code_full' using errcode = 'P0001'; end if;
    update public.invite_codes set used_count = used_count + 1 where code = inv.code;
    insert into public.profiles (id, display_name, role, avatar_color)
    values (auth.uid(), 'kylezhang', 'admin', '#ffb020')
    on conflict (id) do update set display_name = 'kylezhang', role = 'admin', avatar_color = '#ffb020'
    returning * into me;
    return me;
  end if;

  if found and me.role = 'member' then return me; end if;   -- already a member: no seat consumed
  if char_length(clean_name) < 2 or char_length(clean_name) > 20 or clean_name ~* '^guest-' then
    raise exception 'name_invalid' using errcode = 'P0001';
  end if;
  if not public.is_name_available(clean_name) then
    raise exception 'name_taken' using errcode = 'P0001';
  end if;
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

-- Members and admins may post hotspots.
drop policy if exists "Members insert own spots" on public.fishing_spots;
create policy "Members insert own spots"
  on public.fishing_spots
  for insert
  to authenticated
  with check (
    creator_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('member', 'admin'))
  );

-- One-click clear (admin only). Returns how many reports were removed.
create or replace function public.admin_clear_spots()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  delete from public.fishing_spots where true;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.admin_clear_spots() from public, anon;
grant execute on function public.admin_clear_spots() to authenticated;

-- ─── Backup (no website needed): clear everything ───────────────────────────
--   delete from public.fishing_spots;
-- Open pages pick this up on their next refresh/reconnect (the in-app button refreshes everyone instantly).
-- Admin code usage / disable:
--   select code, grants_role, used_count, max_uses, active from public.invite_codes;
--   update public.invite_codes set active = false where code = '<ADMIN_CODE>';
