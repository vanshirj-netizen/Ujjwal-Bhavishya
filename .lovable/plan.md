

# Two Targeted Fixes

## FIX 1 — Google Sign-In Redirect Loop

**Problem**: After Google OAuth completes, user lands back on `/auth` because the Splash page only checks session via `getSession()` after its progress bar completes — it misses the OAuth callback session that arrives asynchronously.

**Changes in `src/pages/Splash.tsx`**:
- Add `onAuthStateChange` listener on mount that fires routing logic when a `SIGNED_IN` event arrives (handles OAuth callback race)
- Update routing: if `onboarding_complete === true` → `/dashboard`, otherwise → `/onboarding`
- The existing `getSession()` check after progress bar stays as fallback

**Changes in `src/pages/Auth.tsx`**:
- Already has session guard redirecting to `/` — no change needed there
- The `redirect_uri: window.location.origin` in the Google OAuth call already points to `/` (Splash) — no change needed

**No database changes** — the `handle_new_user` trigger already fires for all auth methods including OAuth.

## FIX 2 — Dashboard Greeting Real Name

**Changes in `src/pages/Dashboard.tsx`**:
- Add `useEffect` to fetch profile `full_name` from the `profiles` table using `supabase.auth.getSession()` for the user ID
- Fallback chain: `profiles.full_name` first word → `user_metadata.full_name` first word → email before `@` → empty (just "Namaste 👋")
- Initialize `firstName` as empty string (loading state shows "Namaste 👋"), never "Student"
- Also fetch real `current_streak` and progress data from database

## Files Changed
1. `src/pages/Splash.tsx` — add `onAuthStateChange` listener, fix routing to `/dashboard` when onboarding complete
2. `src/pages/Dashboard.tsx` — fetch real name from profiles, apply fallback chain

No design, animation, schema, or other routing changes.

