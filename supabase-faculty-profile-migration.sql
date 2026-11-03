-- Run this once in the Supabase SQL Editor to enable expanded faculty profiles.
alter table public.faculty
  add column if not exists long_description text,
  add column if not exists recent_publications text;
