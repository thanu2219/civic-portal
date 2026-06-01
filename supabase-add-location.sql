-- =====================================================
-- Add location column to requests
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

alter table public.requests add column if not exists location text;
