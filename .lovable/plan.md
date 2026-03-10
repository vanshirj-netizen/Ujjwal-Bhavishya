

# Replace YouTube iframe with HTML5 video in Onboarding Step 0

## Changes

**File: `src/pages/Onboarding.tsx`**

1. Replace the `VIDEO_URL` constant with the Supabase Storage MP4 URL
2. Replace the `<iframe>` block (lines 86-92) with an `<video>` element:
   - `autoPlay`, `playsInline`, `muted={false}`, `controls={false}`
   - `className` for full-screen centered with `object-contain`
   - `onEnded={() => nextStep()}` for automatic fade transition to Step 1
3. Everything else (skip button, fade transitions, other steps) stays identical

