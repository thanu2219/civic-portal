-- =====================================================
-- Seed departments table (idempotent)
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

insert into public.departments (name, slug) values
  ('Electricity', 'electricity'),
  ('Municipality', 'municipality'),
  ('Road & Transportation', 'road_and_transportation'),
  ('Water', 'water'),
  ('Traffic', 'traffic')
on conflict (slug) do nothing;

-- Verify
select * from public.departments order by name;
