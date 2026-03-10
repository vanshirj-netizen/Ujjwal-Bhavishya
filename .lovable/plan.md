

# Onboarding Flow Rewrite Plan

## Summary
Replace the current Splash screen and Onboarding page with a 5-screen flow: Gateway Loader → Brand Video → Namaste Welcome → Choose Course → Choose Master. Also add a dashboard entry animation. No database or auth changes needed.

## Architecture

The current `/` (Splash) and `/onboarding` (Onboarding) pages will be rewritten. The routing stays the same -- no new routes added.

```text
Flow for NEW users (after auth):
  / (Gateway Loader, 2.5s) → /onboarding (step 0: Video → step 1: Namaste → step 2: Course → step 3: Master) → /dashboard (with entry animation)

Flow for RETURNING users:
  / (Gateway Loader, 2.5s) → /dashboard (with entry animation)
```

## File Changes

### 1. `src/pages/Splash.tsx` — Complete rewrite → "Gateway Loader"
- Full green background with UB logo + gold glow pulse
- "Your Gateway to Greatness is Loading" text (Playfair Display, cream)
- Gold progress bar animating 0→100% over 2.5s with synced counter
- 3-5 floating golden butterfly emojis rising continuously from bottom
- On completion: check auth session → fetch profile → route based on `onboarding_complete`
- If not logged in → `/auth`
- If logged in + `onboarding_complete = false` → `/onboarding`
- If logged in + `onboarding_complete = true` → `/dashboard`
- Fade-out transition (0.4s) before navigation

### 2. `src/pages/Onboarding.tsx` — Complete rewrite → 4-step flow
- **Step 0 — Brand Video**: YouTube embed (shorts/35LDd-nJsa0), autoplay, unmuted, no controls. Black background. "Skip →" button fades in after 2s (gold text, top-right). On end or skip → step 1.
- **Step 1 — Namaste Welcome**: 4 gold ✦ stars animate in with 120ms stagger → settle into row. "Namaste, {full_name} 🙏" fades in (32px Playfair, gold). Subtitle fades in 0.4s later (Inter, cream, max-w 320px). "Let's Begin →" CTA appears 0.5s after subtitle with gold shimmer sweep.
- **Step 2 — Choose Your Course**: 2×2 grid. Aarambh card has gold glowing border + "Now Live ✦" badge, fully clickable. Other 3 cards dimmed with dark overlay + "Coming Soon" badge, not clickable. CTA: "Begin My Journey →" activates after selection.
- **Step 3 — Choose Your Master**: Two side-by-side cards with placeholder images (`/images/gyani.jpg`, `/images/gyanu.jpg`), golden frame, traits text, ▶ Play Intro button (placeholder audio paths). Only one selectable. Selected = bright gold glow, unselected = opacity 0.6. CTA: "I Choose {name} →". On click: save `selected_master` + set `onboarding_complete = true` in profiles → navigate to `/dashboard`.
- Profile data (full_name) fetched from Supabase on mount.

### 3. `src/pages/Dashboard.tsx` — Add entry animation sequence
- On mount, play a ~1.5s choreographed entry:
  1. Screen starts black
  2. Butterfly emoji rises from bottom with gold trail
  3. Header slides down (300ms)
  4. Progress ring draws itself (400ms)
  5. Today's lesson card rises from bottom (350ms)
  6. Course cards appear with 150ms stagger
  7. Bottom nav slides up last (300ms)
- After animation: fully interactive, no looping
- Uses Framer Motion orchestration with staggered delays

### 4. `src/pages/Auth.tsx` — Minor routing fix
- After signup: navigate to `/` (Gateway Loader) instead of `/onboarding` directly
- After login: navigate to `/` (Gateway Loader) instead of `/dashboard` directly
- The Gateway Loader handles the routing logic based on profile state

## Technical Details

- **YouTube embed for brand video**: Use an iframe with `https://www.youtube.com/embed/35LDd-nJsa0?autoplay=1&controls=0&rel=0&showinfo=0` — note: browsers block unmuted autoplay, so we attempt unmuted but gracefully handle if blocked
- **Placeholder media paths**: `/images/gyani.jpg`, `/images/gyanu.jpg`, `/audio/gyani-intro.mp3`, `/audio/gyanu-intro.mp3` — single-line swappable later
- **Audio playback**: Use HTML5 `Audio` API with try/catch for graceful fallback if files missing
- **Gold shimmer button**: CSS `background-position` animation sweeping a highlight across the button
- **No new routes or pages added** — only rewrites of existing Splash.tsx and Onboarding.tsx, minor edits to Dashboard.tsx and Auth.tsx
- **No database schema changes** — uses existing `profiles.selected_master` and `profiles.onboarding_complete` fields

