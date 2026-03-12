

# Fix Build Error + Create DayScreen + Update App & Dashboard

## 1. Fix `src/lib/userContext.ts` Build Error
**Line 41**: Change `"day_number, title, practice_sentence"` to `"day_number, title"` — `practice_sentence` doesn't exist on the `lessons` table (it's in `practice_sentences` table instead).

## 2. Create `src/pages/DayScreen.tsx`
Full immersive learning page with:
- **6 steps**: Gamma Lesson → Gyani Video → Gyanu Video → Quiz → Score Entry → Day Complete celebration
- **Orientation detection**: Rotate prompt overlay for portrait users; landscape mode splits into left content panel + right stepper panel
- **Free tier gate**: Days > 5 show lock screen for `payment_status === "free"`
- **Resume logic**: On load, checks existing `progress` row to auto-set the current step
- **YouTube embed converter**: Handles youtu.be, watch?v=, and already-embedded URLs
- **Step completion**: Each step writes to `progress` table; day completion also updates `enrollments` and `profiles.current_streak`
- **Day Complete celebration**: Full-screen takeover with gold particles, streak counter animation, Daily Flame CTA, and Next Day card
- **Bottom nav hidden**: Adds `hide-bottom-nav` class to body on mount, removes on unmount

## 3. Update `src/App.tsx`
Add two routes:
```tsx
<Route path="/day/:dayNumber" element={<DayScreen />} />
<Route path="/flame/:dayNumber" element={<div className="min-h-screen bg-background flex items-center justify-center text-foreground/40">Flame Coming Soon</div>} />
```

## 4. Update `src/pages/Dashboard.tsx`
Replace the static "Today's Lesson Card" with dynamic data:
- Fetch `enrollment` (current_day, payment_status), `lesson` (title, week_number), and `progress` (step completion booleans) for the current day
- Show week number, lesson title (without "Day X:" prefix), mini 5-dot step progress
- CTA: "Day Complete ✦" (if done), "Continue →" (if partial), "Start Day X →" (if new)
- Free tier lock overlay for day > 5
- Navigate to `/day/{current_day}` on click

## Files Modified
1. `src/lib/userContext.ts` — one-line fix (remove `practice_sentence`)
2. `src/pages/DayScreen.tsx` — new file (~600 lines)
3. `src/App.tsx` — add import + 2 routes
4. `src/pages/Dashboard.tsx` — update lesson card section with dynamic fetch + navigation

