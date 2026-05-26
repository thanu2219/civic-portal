-- Run this in Supabase SQL Editor to fix missing policies

-- Allow users to insert their own profile (fallback if trigger missed)
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Create storage buckets if they don't exist
insert into storage.buckets (id, name, public)
values ('request-photos', 'request-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('news-images', 'news-images', true)
on conflict (id) do nothing;

-- Storage policies (skip if already exist)
do $$
begin
  -- Request photos upload
  if not exists (
    select 1 from pg_policies where policyname = 'Authenticated users upload request photos'
  ) then
    create policy "Authenticated users upload request photos"
      on storage.objects for insert
      to authenticated
      with check (bucket_id = 'request-photos');
  end if;

  -- Public read request photos
  if not exists (
    select 1 from pg_policies where policyname = 'Public read request photos'
  ) then
    create policy "Public read request photos"
      on storage.objects for select
      to public
      using (bucket_id = 'request-photos');
  end if;

  -- Admins upload news images
  if not exists (
    select 1 from pg_policies where policyname = 'Admins upload news images'
  ) then
    create policy "Admins upload news images"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'news-images'
        and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      );
  end if;

  -- Public read news images
  if not exists (
    select 1 from pg_policies where policyname = 'Public read news images'
  ) then
    create policy "Public read news images"
      on storage.objects for select
      to public
      using (bucket_id = 'news-images');
  end if;
end $$;
