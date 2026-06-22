-- =============================================================
-- GlobeTrek Adventures — Supabase database schema
-- Run this WHOLE file once in:  Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- It creates 3 simple tables (profiles, packages, bookings), security
-- rules (RLS), a few starter packages, and backfills profiles for any
-- existing users. Profiles are created by the app (JavaScript) — there
-- is NO PL/pgSQL trigger.
--
-- NOTE: the lines below reset the 3 app tables for a clean install.
-- This is safe on a fresh project. Remove them if you already have
-- real data you want to keep.
-- =============================================================
drop table if exists public.bookings cascade;
drop table if exists public.packages cascade;
drop table if exists public.profiles cascade;

-- -------------------------------------------------------------
-- 1) PROFILES  — one row per registered user. Holds the role.
--    role is either 'user' (default) or 'admin'.
-- -------------------------------------------------------------
create table public.profiles (
    id         uuid primary key references auth.users (id) on delete cascade,
    full_name  text,
    email      text,
    role       text not null default 'user',
    created_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- 2) PACKAGES  — the tour packages shown on the website.
-- -------------------------------------------------------------
create table public.packages (
    id          bigint generated always as identity primary key,
    destination text not null,
    description text,
    price       numeric not null default 0,
    duration    text,
    image_url   text,
    gallery     text,   -- extra photo URLs, one per line
    route       text,   -- itinerary / route, one stop per line
    hotels      text,   -- recommended hotels, one per line
    created_at  timestamptz not null default now()
);

-- -------------------------------------------------------------
-- 3) BOOKINGS  — a trip booked by a user.
-- -------------------------------------------------------------
create table public.bookings (
    id          bigint generated always as identity primary key,
    user_id     uuid not null references public.profiles (id) on delete cascade,
    package_id  bigint references public.packages (id) on delete set null,
    title       text not null,
    price       numeric not null default 0,
    image       text,
    status      text not null default 'pending',   -- 'pending' or 'confirmed'
    travel_date date,
    created_at  timestamptz not null default now()
);

-- -------------------------------------------------------------
-- Helper: is the current logged-in user an admin?
-- SECURITY DEFINER so it can read profiles without tripping RLS.
-- -------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
    );
$$;

-- -------------------------------------------------------------
-- Profile creation is handled by the app in JavaScript (ensureProfile()
-- in app.js) right after sign-up / first login. No PL/pgSQL trigger is
-- used. The "profiles_insert_self" RLS policy below lets a signed-in
-- user create only their own profile row (as a normal 'user').
-- -------------------------------------------------------------

-- Backfill profiles for users who already signed up before this ran.
insert into public.profiles (id, full_name, email, role)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
       u.email,
       'user'
from auth.users u
on conflict (id) do nothing;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.bookings enable row level security;

-- ---- PROFILES policies ----
create policy "profiles_select_own_or_admin" on public.profiles
    for select using (auth.uid() = id or public.is_admin());

-- A signed-in user can create only their own profile, and only as 'user'.
create policy "profiles_insert_self" on public.profiles
    for insert with check (auth.uid() = id and role = 'user');

-- A user can edit their own profile but cannot change their role.
create policy "profiles_update_self" on public.profiles
    for update using (auth.uid() = id) with check (auth.uid() = id and role = 'user');

-- Admins can update any profile (including changing roles).
create policy "profiles_admin_update" on public.profiles
    for update using (public.is_admin()) with check (public.is_admin());

-- ---- PACKAGES policies ----
-- Anyone (even logged out) can read packages so they show on the site.
create policy "packages_public_read" on public.packages
    for select using (true);

-- Only admins can create / edit / delete packages.
create policy "packages_admin_insert" on public.packages
    for insert with check (public.is_admin());

create policy "packages_admin_update" on public.packages
    for update using (public.is_admin());

create policy "packages_admin_delete" on public.packages
    for delete using (public.is_admin());

-- ---- BOOKINGS policies ----
-- A user sees/edits their own bookings; an admin sees/edits all.
create policy "bookings_select_own_or_admin" on public.bookings
    for select using (auth.uid() = user_id or public.is_admin());

create policy "bookings_insert_own" on public.bookings
    for insert with check (auth.uid() = user_id);

create policy "bookings_update_own_or_admin" on public.bookings
    for update using (auth.uid() = user_id or public.is_admin());

create policy "bookings_delete_own_or_admin" on public.bookings
    for delete using (auth.uid() = user_id or public.is_admin());

-- =============================================================
-- STARTER PACKAGES
-- =============================================================
insert into public.packages (destination, description, price, duration, image_url) values
    ('Bali, Indonesia', 'Tropical paradise retreat with private villa access and sunset beach excursions.', 1200, '7 Days', 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80'),
    ('Swiss Alps',       'Mountain peak ski adventures, alpine spa getaways, and panoramic cable-car trips.',   1850, '5 Days', 'https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=600&q=80'),
    ('Kyoto, Japan',     'Mystical temples, cherry blossoms, and traditional tea ceremonies in ancient Japan.', 1499, '6 Days', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80');

-- =============================================================
-- MAKE YOURSELF AN ADMIN
-- 1. Sign up in the app first (so your profile row exists).
-- 2. Then run this line with your email:
--
--    update public.profiles set role = 'admin' where email = 'you@example.com';
-- =============================================================
