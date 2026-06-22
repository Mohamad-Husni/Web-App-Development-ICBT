# GlobeTrek Adventures — Supabase Backend Audit Report

**Date:** June 2026
**Scope:** Review of the Supabase backend integration, database schema, and frontend usage in `app.js`, `env.js`, `login.html`, `dashboard.html`, `admin.html`, and `supabase/schema.sql`.

---

## Executive Summary

The application connects to a live Supabase project (`hxpgzfnxyuoftkztajpf`) using the public anon key stored in `env.js`. The backend uses three tables — `profiles`, `packages`, and `bookings` — protected by Row Level Security (RLS). The integration is functionally complete for browsing, booking, and admin management, but there are several configuration, security, and data-integrity concerns that should be addressed before production use.

---

## Issues Found

### 1. HIGH — Production Supabase credentials are committed to the repository

**Location:** `env.js`

The file contains the real project URL and public anon key:

```js
window.GLOBETREK_CONFIG = {
    SUPABASE_URL: 'https://hxpgzfnxyuoftkztajpf.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIs...'
};
```

While the **anon key is public by design** and RLS is intended to protect data, committing a live project's credentials to a public repo makes it impossible for anyone else to fork or reuse the codebase without pointing at your Supabase project. It also makes key rotation and environment separation harder.

**Recommendation:**
- Keep `env.js` as a template (e.g., `env.js.example`) and add `env.js` to `.gitignore`.
- Instruct each developer/deployment to create their own `env.js` from the template.
- Rotate the current anon key in Supabase Dashboard after removing it from version control.

---

### 2. HIGH — `schema.sql` drops live tables every time it runs

**Location:** `supabase/schema.sql` (lines 13–15)

```sql
drop table if exists public.bookings cascade;
drop table if exists public.packages cascade;
drop table if exists public.profiles cascade;
```

These lines are useful for a clean install, but they destroy all real data if the script is ever run again.

**Recommendation:**
- Move the `drop table` statements into a separate `supabase/reset.sql` script labeled clearly as destructive.
- Keep `schema.sql` as a safe, idempotent setup script that only creates tables/policies if they do not exist.

---

### 3. MEDIUM — `bookings` are inserted without a travel date

**Location:** `app.js` → `createBooking(...)`

The `bookings` table defines a `travel_date date` column, but the insert payload does not set it:

```js
await supabaseInstance.from('bookings').insert([{
    user_id: session.user.id,
    package_id: packageId,
    title,
    price: parseFloat(price),
    image,
    status: 'pending'
}]);
```

The search widget has a date picker, but that date is never passed to the booking function.

**Recommendation:**
- Capture the selected travel date from the search form and pass it through to `bookTour(...)` / `createBooking(...)`.
- Alternatively, remove the unused `travel_date` column from the schema.

---

### 4. MEDIUM — No positive-price constraint on `packages.price`

**Location:** `supabase/schema.sql`

```sql
price numeric not null default 0
```

A package can be inserted with a negative or zero price through the admin form or direct API access. The frontend validates `min="1"` on the input, but the database has no check constraint.

**Recommendation:**
- Add a check constraint: `price numeric not null default 0 check (price >= 0)`.

---

### 5. MEDIUM — `bookings.package_id` is nullable, allowing orphaned bookings

**Location:** `supabase/schema.sql`

```sql
package_id  bigint references public.packages (id) on delete set null
```

Wishlist bookings are created with `package_id = null`, which is intentional. However, there is no application-level guarantee that package-derived bookings include a valid `package_id`, and the column itself allows `null` for all bookings.

**Recommendation:**
- If every booking must relate to a real package, make the column `not null` and create a separate table for wishlist items.
- If wishlist-to-booking behavior is intentional, document this design clearly and keep the schema as-is.

---

### 6. FIXED — Google OAuth redirect was not handled by a callback page

**Location:** `login.html` (previously) and new `auth-callback.html`

Previously, after Google OAuth, users were redirected to `dashboard.html` with the session tokens still in the URL hash (`#access_token=...`). The dashboard route guard ran before Supabase finished extracting the session, causing the user to be redirected back to the login page or stuck on the URL with the hash.

**Fix applied:**
- Created `auth-callback.html` as the dedicated OAuth callback target.
- Added `SITE_URL` and `REDIRECT_URL` to `env.js`.
- Updated `login.html` to send Google OAuth users to `auth-callback.html`.
- The callback page calls `supabase.auth.getSession()` to extract the session, then redirects based on the user's role:
  - `dashboard.html` for normal users
  - `admin.html` for admins

**Required Supabase configuration:**
- Add `https://wad-husni.vercel.app/auth-callback.html` to **Redirect URLs** in Supabase Authentication settings.
- For local testing, also add `http://localhost:5500/auth-callback.html`.

---

### 7. LOW — Dashboard shows the Admin Console link based on client-side email string check

**Location:** `dashboard.html`

```js
if (email.toLowerCase().includes('admin')) {
    // show Admin Console tab
}
```

This is a UI-only check. The real admin verification happens in `admin.html` via the server-side `is_admin()` function and RLS, so unauthorized users cannot access admin data. However, the UI inconsistency is confusing and can be bypassed to reveal the menu item.

**Recommendation:**
- Use the `window.isAdmin()` helper (which checks the `profiles.role` value) instead of scanning the email string.

---

### 8. LOW — Missing `user_id` default on `bookings` is enforced only by RLS

The schema does not set `user_id` to `auth.uid()` by default. RLS prevents users from inserting rows for other users, but the application must always supply the `user_id` correctly. This is currently handled in `app.js`, so it is not an immediate bug, but it is a fragile design.

**Recommendation:**
- Add a default value: `user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade`.

---

## Verified Working Areas

- ✅ Supabase client is initialized correctly in `app.js` using `env.js`.
- ✅ RLS policies are in place for `profiles`, `packages`, and `bookings`.
- ✅ Admin checks use the server-side `public.is_admin()` function.
- ✅ `profiles` rows are created from the app in JavaScript (`ensureProfile()` in `app.js`) on sign-up / first login — no PL/pgSQL trigger.
- ✅ Bookings, packages, and admin operations are routed through `app.js` helpers.
- ✅ Dashboard and admin pages have route guards that redirect unauthorized users.

---

## Recommended Priority Fixes

| Priority | Fix |
|----------|-----|
| **HIGH** | Remove live `env.js` credentials from the repo; provide `env.js.example` and rotate the anon key. |
| **HIGH** | Separate destructive `drop table` statements from `schema.sql` into a `reset.sql` script. |
| **MEDIUM** | Pass the selected travel date into `createBooking` or remove the unused `travel_date` column. |
| **MEDIUM** | Add `check (price >= 0)` to `packages.price`. |
| **LOW** | Use `window.isAdmin()` instead of email-string matching in `dashboard.html`. |
| **LOW** | Document the exact Google OAuth redirect URL required in Supabase. |

---

*No live database queries were executed during this audit.*
