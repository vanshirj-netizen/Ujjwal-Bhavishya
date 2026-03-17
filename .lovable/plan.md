

# Full Design System Overhaul + Splash Screen + Dashboard Redesign + Quote Audio

This is a large multi-prompt implementation covering 5 interconnected changes. Here is the consolidated plan.

---

## PROMPT 1 — SplashScreen Component

### New files
- **`src/components/SplashScreen.tsx`** — Full-screen fixed overlay (z-9999, bg #000e09) with:
  - 3 aurora gradient blobs (amber, green, gold) with slow float keyframes
  - Logo pill with `<video>` element using the UB_Pill_Video.mp4 from Supabase storage
  - Gold percentage counter (Playfair Display, clamp 4-7rem, gold gradient text) counting 0-100 over 2.2s
  - 2px progress bar synced to counter with shimmer animation
  - "LOADING YOUR GATEWAY TO GREATNESS" tagline (Space Grotesk, 0.6rem, letter-spacing 4px)
  - `sessionStorage` check to skip on repeat visits
  - `onComplete` prop called after 300ms delay + 0.6s fade-out

### Modified files
- **`src/App.tsx`** — Add `splashDone` state, render `<SplashScreen>` as fixed overlay before routes become visible

---

## PROMPT 2 — Design System Components

### New files
- **`src/components/AuroraBackground.tsx`** — Fixed full-screen aurora (3 blobs + gold grid overlay), rendered as first child of layout on every screen
- **`src/components/ui/GoldCard.tsx`** — Animated gold-gradient-border card with inner dark bg
- **`src/components/ui/GoldButton.tsx`** — Gold gradient primary button with hover lift + shadow
- **`src/components/ui/GlassButton.tsx`** — Frosted glass secondary button
- **`src/components/ui/SectionLabel.tsx`** — Gold gradient uppercase label with left bar

### Modified files
- **`index.html`** — Add Space Grotesk font link alongside existing fonts
- **`src/index.css`** — Add CSS custom properties (`--gg`, `--ggh`, `--gold`, `--green`, `--cream`, `--card-bg`, `--fd`, `--fa`, `--fb`), update body background to #000e09

### Pages to restyle (visual only, no logic changes)
- **`src/pages/Dashboard.tsx`** — Full redesign (see Prompt 3)
- **`src/pages/Journey.tsx`** — Replace cards/buttons with GoldCard/GoldButton/GlassButton
- **`src/pages/Profile.tsx`** — Replace cards/buttons with design system components
- **`src/pages/DayScreen.tsx`** — Replace buttons with GoldButton/GlassButton, cards with GoldCard
- **`src/pages/FlamePage.tsx`** — Same treatment
- **`src/pages/AnubhavPage.tsx`** — Same treatment
- **`src/pages/Auth.tsx`** — Replace buttons, add AuroraBackground
- **`src/pages/Onboarding.tsx`** — Replace buttons and cards
- **`src/pages/Splash.tsx`** — Will be superseded by new SplashScreen; keep as fallback for `/` route session logic but visual is replaced

---

## PROMPT 3 — Dashboard Redesign

### Modified: `src/pages/Dashboard.tsx`
Keep all existing hooks, queries, state, navigation. Replace entire JSX with 4 sections:

1. **Hero Greeting** — "Namaste" + gold gradient firstName, word-by-word staggered reveal, italic subtitle
2. **Stats Row** — 4-column grid of GoldCards (streak, flames, days active, avg confidence) with count-up animations
3. **Today's Lesson** — GoldCard with glow, SectionLabel, day/title, GoldButton to navigate, pulsing border shadow
4. **Quote of the Day** — GoldCard with SectionLabel, decorative quote mark, quote text, author, master avatar row, play button (wired in Prompt 4)

Remove the 60-day grid (lives on Journey page). Add `pb-[100px]` for bottom nav clearance. All sections fade up sequentially.

Need to fetch `selected_master` from profiles query (already fetched elsewhere, will add to existing query). Need `avgConfidence` — calculate from `daily_flames` confidence_rating average.

---

## PROMPT 4 — Quote Audio Edge Function

### New file: `supabase/functions/generate-daily-quote-voice/index.ts`
- Same auth pattern as `generate-flame-voice`
- **Step 1**: Call Lovable AI Gateway (`google/gemini-2.5-flash-lite`) with character-specific prompts for Gyani or Gyanu, using the 6 delivery styles selected by `(dayNumber * 7 + 3) % 6`
- **Step 2**: Pass generated script to ElevenLabs TTS using `GYANI_VOICE_ID` or `GYANU_VOICE_ID`
- Returns `{ audioBase64, mimeType, script }` or error states

### Modified: `supabase/config.toml`
- Add `[functions.generate-daily-quote-voice]` with `verify_jwt = false`

### Modified: `src/pages/Dashboard.tsx`
- Wire play button: call edge function, play base64 audio, manage button states (loading/playing/played), sessionStorage for "already played today"

---

## PROMPT 5 — Wire Live Quote Data

### Modified: `src/pages/Dashboard.tsx`
- Extend existing lessons query (line 75) to include `quote_text, quote_author` in the SELECT
- Pass to Quote card and to the edge function call
- Fallback: "Every expert was once a beginner." / "Helen Hayes"

---

## Summary of all files changed

| File | Action |
|------|--------|
| `src/components/SplashScreen.tsx` | Create |
| `src/components/AuroraBackground.tsx` | Create |
| `src/components/ui/GoldCard.tsx` | Create |
| `src/components/ui/GoldButton.tsx` | Create |
| `src/components/ui/GlassButton.tsx` | Create |
| `src/components/ui/SectionLabel.tsx` | Create |
| `supabase/functions/generate-daily-quote-voice/index.ts` | Create |
| `index.html` | Edit (add font) |
| `src/index.css` | Edit (add vars, update body) |
| `src/App.tsx` | Edit (add splash state) |
| `supabase/config.toml` | Edit (add function config) |
| `src/pages/Dashboard.tsx` | Full JSX rewrite |
| `src/pages/Journey.tsx` | Restyle with design system |
| `src/pages/Profile.tsx` | Restyle with design system |
| `src/pages/DayScreen.tsx` | Restyle with design system |
| `src/pages/FlamePage.tsx` | Restyle with design system |
| `src/pages/AnubhavPage.tsx` | Restyle with design system |
| `src/pages/Auth.tsx` | Restyle with design system |
| `src/pages/Onboarding.tsx` | Restyle with design system |

No database migrations needed. All existing secrets (`LOVABLE_API_KEY`, `ELEVENLABS_API_KEY`, `GYANI_VOICE_ID`, `GYANU_VOICE_ID`) are already configured.

