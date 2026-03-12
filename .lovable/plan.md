

# Four Fixes: Profile Name, Journey Stats, Email Domain, Onboarding Name Sync

## Root Causes Found

1. **Profile shows "Student"**: Profile.tsx line 64 uses `profileData?.full_name ||` — since DB default is `'Student'` (truthy), it never falls through to Google metadata. Dashboard/Journey already have `!== "Student"` guards but Profile doesn't.

2. **Journey/Dashboard "reset"**: Journey.tsx stats are **hardcoded placeholders** (lines 35-40: all zeros). It never fetches real data. This isn't a reset — the data was never loaded. Dashboard does fetch real data but the user may be seeing the enrollment's `current_day: 0` default.

3. **Email domain**: Onboarding.tsx lines 703-705 use `hello@ujjwalbhavishya.com` — should be `hello@ujjwalbhavishya.co.in`.

4. **Onboarding never saves full_name**: The `handle_new_user` trigger sets `full_name: 'Student'`, and onboarding's `handleFinish` never updates it with the Google name. This is why the name stays "Student" across the app.

## Fix 1 — Profile.tsx: Name fallback guard

**Line 64**: Change the fallback chain to match Dashboard's pattern:
```tsx
const resolvedName =
  (profileData?.full_name && profileData.full_name !== "Student")
    ? profileData.full_name
    : user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      "Student";
```

## Fix 2 — Onboarding.tsx: Persist Google name to profile

In `handleFinish` (line 164-188), add `full_name` to the profile update using the same fallback chain:
```tsx
full_name: session.user.user_metadata?.full_name ||
           session.user.user_metadata?.name ||
           undefined,  // keep existing if no Google name
```
Only include `full_name` in the update if a name is available from metadata.

## Fix 3 — Journey.tsx: Fetch real stats from DB

Replace hardcoded placeholder stats with actual data fetched from the database:
- Fetch `profiles.current_streak` for Day Streak
- Fetch `daily_flames` count for Flames
- Fetch `daily_flames.confidence_rating` average for Avg Confidence  
- Fetch `enrollments.days_completed` (or progress count) for Days Active
- Add `useLocation` + `location.key` dependency for auto-refetch (same pattern as Dashboard)

## Fix 4 — Onboarding.tsx: Email domain

**Lines 703 and 705**: Change `hello@ujjwalbhavishya.com` → `hello@ujjwalbhavishya.co.in` (2 instances).

## Files Modified
1. `src/pages/Profile.tsx` — 1 edit (name guard)
2. `src/pages/Onboarding.tsx` — 3 edits (persist full_name + 2 email fixes)
3. `src/pages/Journey.tsx` — rewrite to fetch real stats from DB

