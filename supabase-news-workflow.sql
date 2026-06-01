-- =====================================================
-- CivicPortal — News & Announcements workflow migration
-- Run this in Supabase Dashboard → SQL Editor
-- Idempotent (safe to run multiple times).
-- =====================================================

-- 1) Schema additions on news_posts
alter table public.news_posts
  add column if not exists post_type text not null default 'news'
    check (post_type in ('news', 'announcement'));

alter table public.news_posts
  add column if not exists category text not null default 'generic'
    check (category in ('generic', 'electricity', 'municipality', 'road_and_transportation', 'water', 'traffic'));

alter table public.news_posts
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected'));

alter table public.news_posts
  add column if not exists rejection_reason text;

alter table public.news_posts
  add column if not exists approved_by uuid references public.profiles(id);

alter table public.news_posts
  add column if not exists approved_at timestamptz;

-- Backfill: previously published posts become approved.
update public.news_posts
   set status = 'approved'
 where status = 'pending' and published = true;

-- 2) Drop old policies (if they exist) and recreate with workflow logic
drop policy if exists "Published posts are viewable" on public.news_posts;
drop policy if exists "Admins see all posts" on public.news_posts;
drop policy if exists "Admins manage posts" on public.news_posts;
drop policy if exists "Approved posts are viewable" on public.news_posts;
drop policy if exists "Authors see own posts" on public.news_posts;
drop policy if exists "Dept staff see same dept posts" on public.news_posts;
drop policy if exists "Staff create posts" on public.news_posts;
drop policy if exists "Authors update own pending posts" on public.news_posts;
drop policy if exists "Admins manage all posts" on public.news_posts;

-- Anyone authenticated can read approved posts
create policy "Approved posts are viewable"
  on public.news_posts for select
  to authenticated
  using (status = 'approved');

-- Authors can see their own posts (any status)
create policy "Authors see own posts"
  on public.news_posts for select
  to authenticated
  using (author_id = auth.uid());

-- Dept admins of the same department can see their dept's posts (any status).
-- A post "belongs" to a dept when its category slug matches a department slug
-- that the current user is staff of. Generic posts are not visible cross-dept.
create policy "Dept staff see same dept posts"
  on public.news_posts for select
  to authenticated
  using (
    exists (
      select 1
      from public.department_staff ds
      join public.departments d on d.id = ds.department_id
      where ds.user_id = auth.uid()
        and d.slug = news_posts.category
    )
  );

-- Admins see all posts
create policy "Admins see all posts"
  on public.news_posts for select
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Dept admins and admins can create posts (always as themselves)
create policy "Staff create posts"
  on public.news_posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('dept_admin', 'admin')
    )
  );

-- NOTE: Posts cannot be edited after creation by anyone.
-- The only "update" allowed is the admin approve/reject workflow, which is
-- handled by the dedicated policy below.

-- Drop any prior edit policies so this migration is idempotent
drop policy if exists "Authors update own pending posts" on public.news_posts;
drop policy if exists "Dept staff update same dept pending posts" on public.news_posts;

-- Admins can update posts (used only for approve/reject workflow).
drop policy if exists "Admins update posts" on public.news_posts;
create policy "Admins update posts"
  on public.news_posts for update
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can delete ONLY rejected posts.
drop policy if exists "Admins delete rejected posts" on public.news_posts;
drop policy if exists "Admins manage all posts" on public.news_posts;
create policy "Admins delete rejected posts"
  on public.news_posts for delete
  to authenticated
  using (
    status = 'rejected'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Dept admins can delete ONLY rejected posts in their department.
drop policy if exists "Dept staff delete same dept pending posts" on public.news_posts;
drop policy if exists "Dept staff delete same dept rejected posts" on public.news_posts;
create policy "Dept staff delete same dept rejected posts"
  on public.news_posts for delete
  to authenticated
  using (
    status = 'rejected'
    and exists (
      select 1
      from public.department_staff ds
      join public.departments d on d.id = ds.department_id
      where ds.user_id = auth.uid()
        and d.slug = news_posts.category
    )
  );

-- 3) Storage: allow dept admins to upload news images
drop policy if exists "Admins upload news images" on storage.objects;
drop policy if exists "Staff upload news images" on storage.objects;

create policy "Staff upload news images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'news-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('dept_admin', 'admin')
    )
  );

-- 4) Comments: only show on approved posts (replace policy)
drop policy if exists "Comments viewable on published posts" on public.news_comments;
drop policy if exists "Comments viewable on approved posts" on public.news_comments;

create policy "Comments viewable on approved posts"
  on public.news_comments for select
  to authenticated
  using (
    exists (
      select 1 from public.news_posts
      where id = news_comments.post_id and status = 'approved'
    )
  );
