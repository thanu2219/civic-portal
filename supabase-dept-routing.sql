-- =====================================================
-- Department Routing Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL)
-- =====================================================

-- 1. Remove the policy that lets dept_admins see ALL pending requests
drop policy if exists "Dept admins see pending requests" on public.requests;

-- 2. Add resolution_photo column to requests
alter table public.requests add column if not exists resolution_photo text;
