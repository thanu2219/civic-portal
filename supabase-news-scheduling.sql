-- =====================================================
-- CivicPortal — News scheduling + edit-pending policies
-- Adds start_date / end_date for scheduling and re-enables
-- update access for pending posts (author + same-dept staff).
-- Idempotent: safe to re-run.
-- =====================================================

-- 1) Scheduling columns (nullable; null = no constraint on that side)
alter table public.news_posts
  add column if not exists start_date timestamptz;

alter table public.news_posts
  add column if not exists end_date timestamptz;

-- 2) Authors can edit their own posts while still pending
drop policy if exists "Authors update own pending posts" on public.news_posts;
create policy "Authors update own pending posts"
  on public.news_posts for update
  to authenticated
  using (
    author_id = auth.uid()
    and status = 'pending'
  )
  with check (
    author_id = auth.uid()
    and status = 'pending'
  );

-- 3) Dept staff (same dept as the post's category) can edit pending posts
drop policy if exists "Dept staff update same dept pending posts" on public.news_posts;
create policy "Dept staff update same dept pending posts"
  on public.news_posts for update
  to authenticated
  using (
    status = 'pending'
    and exists (
      select 1
      from public.department_staff ds
      join public.departments d on d.id = ds.department_id
      where ds.user_id = auth.uid()
        and d.slug = news_posts.category
    )
  )
  with check (
    status = 'pending'
    and exists (
      select 1
      from public.department_staff ds
      join public.departments d on d.id = ds.department_id
      where ds.user_id = auth.uid()
        and d.slug = news_posts.category
    )
  );
