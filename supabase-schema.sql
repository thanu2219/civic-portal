-- =====================================================
-- CivicPortal — Supabase Database Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL)
-- =====================================================

-- 1. PROFILES (synced from auth.users via trigger)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'citizen' check (role in ('citizen', 'dept_admin', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'citizen'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. DEPARTMENTS
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

alter table public.departments enable row level security;

create policy "Departments are viewable by everyone"
  on public.departments for select
  to authenticated
  using (true);

-- Seed departments
insert into public.departments (name, slug) values
  ('Electricity', 'electricity'),
  ('Municipality', 'municipality'),
  ('Road & Transportation', 'road_and_transportation'),
  ('Water', 'water'),
  ('Traffic', 'traffic');


-- 3. DEPARTMENT STAFF (links users to departments)
create table public.department_staff (
  user_id uuid not null references public.profiles(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  primary key (user_id, department_id)
);

alter table public.department_staff enable row level security;

create policy "Staff records viewable by authenticated"
  on public.department_staff for select
  to authenticated
  using (true);

create policy "Admins manage staff"
  on public.department_staff for all
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- 4. REQUESTS
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null check (category in ('electricity', 'municipality', 'road_and_transportation', 'water', 'traffic')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'closed')),
  department_id uuid references public.departments(id),
  assigned_to uuid references public.profiles(id),
  resolution text,
  rejection_reason text,
  merged_into uuid references public.requests(id),
  photos text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.requests enable row level security;

-- Citizens can insert their own requests
create policy "Users can create requests"
  on public.requests for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Citizens see their own requests
create policy "Users can view own requests"
  on public.requests for select
  to authenticated
  using (auth.uid() = user_id);

-- Admins see all requests
create policy "Admins can view all requests"
  on public.requests for select
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Dept admins see requests assigned to their departments
create policy "Dept admins see their department requests"
  on public.requests for select
  to authenticated
  using (
    exists (
      select 1 from public.department_staff ds
      where ds.user_id = auth.uid() and ds.department_id = requests.department_id
    )
  );

-- Dept admins can also see pending requests (to approve)
create policy "Dept admins see pending requests"
  on public.requests for select
  to authenticated
  using (
    status = 'pending' and
    exists (select 1 from public.profiles where id = auth.uid() and role in ('dept_admin', 'admin'))
  );

-- Admins can update any request
create policy "Admins can update requests"
  on public.requests for update
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Dept admins can update requests assigned to their department
create policy "Dept admins can update their requests"
  on public.requests for update
  to authenticated
  using (
    exists (
      select 1 from public.department_staff ds
      where ds.user_id = auth.uid() and ds.department_id = requests.department_id
    )
  );

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger requests_updated_at
  before update on public.requests
  for each row execute function public.update_updated_at();


-- 5. REQUEST EVENTS (audit trail)
create table public.request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  action text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.request_events enable row level security;

create policy "Events viewable by request owner and staff"
  on public.request_events for select
  to authenticated
  using (
    exists (
      select 1 from public.requests r
      where r.id = request_events.request_id
        and (r.user_id = auth.uid()
          or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'dept_admin')))
    )
  );

create policy "Staff can insert events"
  on public.request_events for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'dept_admin'))
  );


-- 6. NEWS POSTS
create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  image_url text,
  author_id uuid not null references public.profiles(id),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news_posts enable row level security;

-- Anyone authenticated can read published posts
create policy "Published posts are viewable"
  on public.news_posts for select
  to authenticated
  using (published = true);

-- Admins see all posts (including drafts)
create policy "Admins see all posts"
  on public.news_posts for select
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Only admins can create/update/delete
create policy "Admins manage posts"
  on public.news_posts for all
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create trigger news_posts_updated_at
  before update on public.news_posts
  for each row execute function public.update_updated_at();


-- 7. NEWS COMMENTS
create table public.news_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.news_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.news_comments enable row level security;

-- Anyone authenticated can read comments on published posts
create policy "Comments viewable on published posts"
  on public.news_comments for select
  to authenticated
  using (
    exists (select 1 from public.news_posts where id = news_comments.post_id and published = true)
  );

-- Authenticated users can add comments
create policy "Users can add comments"
  on public.news_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can delete own comments
create policy "Users can delete own comments"
  on public.news_comments for delete
  to authenticated
  using (auth.uid() = user_id);


-- =====================================================
-- STORAGE BUCKETS (run in Supabase Dashboard → Storage)
-- Or use the SQL below:
-- =====================================================

-- Create buckets for file uploads
insert into storage.buckets (id, name, public) values ('request-photos', 'request-photos', true);
insert into storage.buckets (id, name, public) values ('news-images', 'news-images', true);

-- Storage policies: authenticated users can upload to request-photos
create policy "Authenticated users upload request photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'request-photos');

create policy "Public read request photos"
  on storage.objects for select
  to public
  using (bucket_id = 'request-photos');

-- Admins upload news images
create policy "Admins upload news images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'news-images'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Public read news images"
  on storage.objects for select
  to public
  using (bucket_id = 'news-images');
