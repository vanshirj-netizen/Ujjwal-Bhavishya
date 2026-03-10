

# Brand Video — Cinematic Play Overlay

## Changes

### 1. `src/pages/Splash.tsx` — Always route to `/onboarding`
Currently Splash routes returning users directly to `/dashboard`. Change so it **always** routes to `/onboarding` after the 2.5s loader (if authenticated). The video screen will handle the onboarding-vs-dashboard routing after video ends.

- Not logged in → `/auth` (unchanged)
- Logged in → `/onboarding` (regardless of `onboarding_complete`)

### 2. `src/pages/Onboarding.tsx` — Rewrite Step 0 (Brand Video)

**New state**: `showPlayOverlay` (boolean) — shown when browser blocks unmuted autoplay.

**Video logic** (using a `ref` on the `<video>` element):
1. On mount, attempt `videoRef.current.play()` (video has `autoPlay`, `muted={false}`, `playsInline`)
2. If `.play()` succeeds → video plays with audio, no overlay
3. If `.play()` rejects → set `showPlayOverlay = true`, show cinematic overlay
4. Overlay: black full-screen, centered 72px gold circle with ▶ icon, pulsing gold glow, "Tap to Begin Your Journey" text below (Inter, cream, 16px)
5. On overlay tap: fade overlay out (0.2s), call `videoRef.current.play()` — guaranteed to work after user gesture

**Remove**: Skip button entirely, `showSkip` state, and the 2s timeout effect.

**onEnded handler**: Instead of always going to step 1, fetch `onboarding_complete` from profiles:
- `false` → proceed to step 1 (Namaste)
- `true` → navigate to `/dashboard`

**Also fetch `onboarding_complete`** alongside `full_name` in the existing profile fetch effect, store in a ref for use in `onEnded`.

### 3. No other files changed
No changes to steps 1-3, database, auth, or any other page.

