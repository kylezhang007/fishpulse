-- ════════════════════════════════════════════════════════════════════════════
-- FishPulse — Friends + 1:1 chat (members only; messages only between friends)
-- Paste into Dashboard → SQL Editor → Run. Re-runnable.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Friendships ────────────────────────────────────────────────────────────
create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  addressee_id  uuid not null references public.profiles (id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  check (requester_id <> addressee_id)
);
-- One relationship per pair, whichever direction.
create unique index if not exists friendships_pair_unique
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table public.friendships enable row level security;

drop policy if exists "See own friendships" on public.friendships;
create policy "See own friendships" on public.friendships
  for select to authenticated using (auth.uid() in (requester_id, addressee_id));

drop policy if exists "Members send requests" on public.friendships;
create policy "Members send requests" on public.friendships
  for insert to authenticated
  with check (
    requester_id = auth.uid() and status = 'pending'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('member', 'admin'))
    and exists (select 1 from public.profiles p where p.id = addressee_id and p.role in ('member', 'admin'))
  );

-- Only the addressee can accept.
drop policy if exists "Addressee accepts" on public.friendships;
create policy "Addressee accepts" on public.friendships
  for update to authenticated
  using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status = 'accepted');

-- Either side can decline / cancel / unfriend.
drop policy if exists "Either side removes" on public.friendships;
create policy "Either side removes" on public.friendships
  for delete to authenticated using (auth.uid() in (requester_id, addressee_id));

revoke truncate on public.friendships from anon, authenticated;
revoke all on public.friendships from anon;

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and least(requester_id, addressee_id) = least(a, b)
      and greatest(requester_id, addressee_id) = greatest(a, b)
  );
$$;
revoke all on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- ─── Messages ───────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  body          text not null check (char_length(btrim(body)) between 1 and 500),
  created_at    timestamptz not null default now()
);
create index if not exists messages_pair_idx on public.messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "Read own conversations" on public.messages;
create policy "Read own conversations" on public.messages
  for select to authenticated using (auth.uid() in (sender_id, recipient_id));

drop policy if exists "Message friends" on public.messages;
create policy "Message friends" on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.are_friends(sender_id, recipient_id));

revoke update, delete, truncate on public.messages from anon, authenticated;
revoke all on public.messages from anon;

-- ─── Realtime (RLS applies: you only receive your own rows) ────────────────
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships') then
    alter publication supabase_realtime add table public.friendships;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- Admin: wipe all chats / friendships
--   delete from public.messages;  delete from public.friendships;
