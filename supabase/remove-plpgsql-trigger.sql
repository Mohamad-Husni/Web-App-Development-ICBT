-- =============================================================
-- GlobeTrek — remove the PL/pgSQL signup trigger
-- Run ONCE in Supabase Dashboard -> SQL Editor.
-- Non-destructive: keeps all data and roles. Profiles are now created
-- by the app (JavaScript, ensureProfile() in app.js).
-- =============================================================

-- 1) Drop the PL/pgSQL trigger + function
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2) Replace the old single update policy with app-friendly, secure ones
drop policy if exists "profiles_update_own_or_admin" on public.profiles;

-- A signed-in user can create only their own profile, and only as 'user'
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
    for insert with check (auth.uid() = id and role = 'user');

-- A user can edit their own profile but cannot change their role
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
    for update using (auth.uid() = id) with check (auth.uid() = id and role = 'user');

-- Admins can update any profile (including changing roles)
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
    for update using (public.is_admin()) with check (public.is_admin());
