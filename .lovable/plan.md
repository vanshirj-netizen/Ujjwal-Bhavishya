

# Five Targeted Fixes

## FIX 1 — "Welcome Back" login routing (`src/pages/Auth.tsx`)
**Current**: After `signInWithPassword`, navigates to `/` (Splash), which re-checks session and routes. This works but can feel redundant.
**Change**: After successful login, fetch `profiles.onboarding_complete` for the user, then route directly to `/dashboard` or `/onboarding`. Replace lines 126-134.

## FIX 2 — Video stretched on desktop (`src/pages/Onboarding.tsx`)
**Current**: Line 119 has `className="w-full h-full object-cover"`.
**Change**: Use `object-cover` on mobile, `object-contain` on desktop with black background:
- `className="w-full h-full object-cover md:object-contain bg-black"`

## FIX 3 — Auth subtitle text (`src/pages/Auth.tsx`)
**Current**: Line 176 shows "Bright Future".
**Change**: Replace with "Your Gateway to Greatness". No other changes.

## FIX 4 — Profile page hero logo (`src/pages/Profile.tsx`)
**Current**: Plain "Profile" text header at top.
**Change**: Replace lines 119-126 with a full-width hero container:
- Height ~200px, deep dark gradient background matching app palette
- Centered UB horizontal logo at ~55% width
- Soft radial gold glow behind logo
- `backdrop-filter: blur(10px)`, subtle bottom border
- Slow shimmer animation via CSS keyframes
- No other profile page changes

## FIX 5 — Dashboard "Namaste, Student" (`src/pages/Dashboard.tsx`)
**Current**: Fallback chain already exists (lines 34-37) but `profiles.full_name` has a DB default of `'Student'`. The check `!== "Student"` is present.
**Change**: Add `user.user_metadata?.name` as fallback step 3 (Google sometimes uses `name` instead of `full_name`). The chain becomes:
1. `profile.full_name` (if not "Student") → first word
2. `user_metadata.full_name` → first word
3. `user_metadata.name` → first word
4. `user.email` before `@`
5. Empty string → just "Namaste 👋"

## Files touched
1. `src/pages/Auth.tsx` — login routing + subtitle text
2. `src/pages/Onboarding.tsx` — video object-fit
3. `src/pages/Profile.tsx` — hero logo section
4. `src/pages/Dashboard.tsx` — name fallback chain

