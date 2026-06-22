-- =============================================================
-- GlobeTrek — add package "details" fields (photos, route, hotels)
-- Run this ONCE in Supabase Dashboard -> SQL Editor if you already
-- have a packages table with data (it does NOT drop anything).
-- =============================================================
alter table public.packages add column if not exists gallery text;  -- photo URLs, one per line
alter table public.packages add column if not exists route   text;  -- itinerary / route, one stop per line
alter table public.packages add column if not exists hotels  text;  -- recommended hotels, one per line
