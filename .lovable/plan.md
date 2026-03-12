

# Three Fixes: DayScreen.tsx + App.tsx

## Fix 1 — DayScreen.tsx: Show Nav + Home on Step 6

**Lines 106-110**: Add a second useEffect after the existing hide-bottom-nav one:
```tsx
useEffect(() => {
  if (currentStep === 6) {
    document.body.classList.remove("hide-bottom-nav");
  }
}, [currentStep]);
```

**Lines 259-295** (Step 6 celebration return): Add two elements:
- A `🏠 Home` button absolutely positioned top-right (`absolute top-5 right-5 z-10 glass-card`) before the main `motion.div`
- A `← Back to Home` text button at the bottom of the celebration content, after the Next Day card, with `delay: 1.2` fade-in

## Fix 2 — DayScreen.tsx: Back arrow always goes home

**Line 403**: Change `navigate(-1)` to `navigate("/")`

## Fix 3 — App.tsx: Flame placeholder upgrade

**Line 32**: Replace the plain "Flame Coming Soon" div with a styled placeholder containing:
- Pulsing 🔥 emoji (text-6xl, animate-pulse)
- "Daily Flame" heading (font-display, text-primary)
- Description text: "Your Daily Flame is being crafted. It will be ready very soon. ✦"
- "← Back to Home" link button (bg-primary, rounded-xl)

## Files Modified
1. `src/pages/DayScreen.tsx` — 3 edits (add currentStep useEffect, home buttons on step 6, back button navigate("/"))
2. `src/App.tsx` — 1 edit (flame placeholder route)

