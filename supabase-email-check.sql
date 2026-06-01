-- =====================================================
-- Function to check if email already registered
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

create or replace function public.email_exists(check_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from auth.users where lower(email) = lower(check_email)
  );
$$;

grant execute on function public.email_exists(text) to anon, authenticated;
