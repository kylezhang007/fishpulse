-- ════════════════════════════════════════════════════════════════════════════
-- FishPulse — Phase C: Community ("the Ocean") — shared catch cards + likes
-- Paste into Dashboard → SQL Editor → Run. Re-runnable.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Posts: a member shares one of their own catch cards ───────────────────
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  catch_id    uuid not null references public.catches (id) on delete cascade,
  caption     text check (caption is null or char_length(caption) <= 140),
  created_at  timestamptz not null default now(),
  unique (catch_id)            -- each card can be shared once
);
create index if not exists posts_created_idx on public.posts (created_at desc);

alter table public.posts enable row level security;
drop policy if exists "Posts are public" on public.posts;
create policy "Posts are public" on public.posts for select to anon, authenticated using (true);

drop policy if exists "Members share own cards" on public.posts;
create policy "Members share own cards" on public.posts
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('member', 'admin'))
    and exists (select 1 from public.catches c where c.id = catch_id and c.user_id = auth.uid())
  );

drop policy if exists "Authors delete own posts" on public.posts;
create policy "Authors delete own posts" on public.posts for delete to authenticated using (user_id = auth.uid());
revoke update, truncate on public.posts from anon, authenticated;

-- ─── Likes ("Nice catch!") ──────────────────────────────────────────────────
create table if not exists public.post_likes (
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;
drop policy if exists "Likes are public" on public.post_likes;
create policy "Likes are public" on public.post_likes for select to anon, authenticated using (true);

drop policy if exists "Members like" on public.post_likes;
create policy "Members like" on public.post_likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('member', 'admin'))
  );

drop policy if exists "Members unlike" on public.post_likes;
create policy "Members unlike" on public.post_likes for delete to authenticated using (user_id = auth.uid());
revoke update, truncate on public.post_likes from anon, authenticated;

-- ─── Realtime: new posts float up for everyone ─────────────────────────────
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts') then
    alter publication supabase_realtime add table public.posts;
  end if;
end;
$$;

-- Admin: clear the ocean
--   delete from public.posts;
