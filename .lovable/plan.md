

# Auth + Onboarding Routing Fix

## Root Cause

The signup loop happens because **email confirmation is required**. After signup, no session is created until the user confirms their email. So: Auth → signup → navigate to `/` (Splash) → Splash finds no session → redirects back to `/auth` → loop.

The network logs confirm this: signup responses show `confirmation_sent_at` and `"role":""` with no session token returned.

## Fix Plan

### 1. Enable auto-confirm for email signups
Since the app expects immediate access after signup, email confirmation must be disabled. This is the only way to get a session immediately after signup. I will use the auth configuration tool to enable auto-confirm.

### 2. `src/pages/Auth.tsx` — Session guard + profile fallback
- Add a `useEffect` that checks for an existing session on mount. If a session exists, immediately redirect to `/` (Splash). This prevents showing the auth form to logged-in users.
- After successful signup, wait briefly (1s) for the `handle_new_user` trigger to create the profile, then check if it exists. If not, manually insert a profile row as fallback.
- Add `console.log` checkpoints at signup success and profile check.

### 3. `src/pages/Splash.tsx` — Profile fetch retry logic
- After getting a valid session, fetch the profile with up to 3 retries (500ms apart) to handle the race condition where the trigger hasn't fired yet.
- Add `console.log` at each routing decision point.

### 4. No changes to
- UI design, database schema, Onboarding.tsx, or any other page.

