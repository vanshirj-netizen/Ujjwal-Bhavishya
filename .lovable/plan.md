

# Landscape Layout Fixes — DayScreen.tsx Only

Visual-only changes. No data/logic changes. No portrait changes.

## Changes Summary

### FIX 1 — Right panel width
Line 511: Change `w-72 px-5 py-6 gap-5` to `w-[26%] min-w-[180px] max-w-[210px] px-3 py-3 gap-3 shrink-0`

### FIX 2 — Content panel padding
Line 510: Change `p-3` to `p-0` for landscape content panel

### FIX 3 — Gamma iframe in landscape
Lines 409-412: Use `isLandscape` ternary — remove border, rounded corners, and gradient overlay in landscape. Keep them in portrait.

### FIX 4 — YouTube iframes in landscape
Lines 420-421 and 432-433: Use `isLandscape` ternary for container class (no border/rounded, use `flex-1`). Add `position: absolute` style to iframes in landscape. Hide the Gyani/Gyanu header cards (`glass-card`) in landscape to maximize video space.

### FIX 5 — Header hidden in landscape
Line 499: Add `isLandscape ? "hidden" : "flex items-center..."` ternary. Move header info into right panel with compact styling: `← Home` button, `W{week} · Day {num}`, lesson title (line-clamp-2).

### FIX 6 — Stepper compact in landscape
- `StepDot` component: Accept `compact` prop — use `w-6 h-6` and `text-[9px]` when compact
- Stepper row: `gap-2` in landscape, connector `h-3` instead of `h-4`

### FIX 7 — CTA button compact in landscape
Line 489: `isLandscape ? "py-3 rounded-xl text-sm" : "py-4 rounded-2xl text-base"`

### FIX 8 — Step 6 full screen overlay
Line 322: Change wrapper from `w-screen h-screen` to `fixed inset-0 z-50` so celebration covers both panels in landscape.

## File modified
`src/pages/DayScreen.tsx` — visual/layout only

