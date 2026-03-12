# Comprehensive Audit: Root Causes & Fix Plan

## Critical Discovery

**The `handle_new_user` trigger is NOT attached to `auth.users`.** The function exists, but no trigger fires it. This means:

- Google sign-in users get NO profile row created
- No UB Student ID generated
- No enrollment row created

**Your user (Vansh Jha, `vanshirj@gmail.com`):**

- Exists in auth.users (id: `f5169821-...`)
- Has 2 completed progress rows (Day 1 & Day 2, scores 9478 and 9441)
- Has **NO profile row** — so `current_streak = 0`, name shows "Student"
- Has **NO enrollment row** — so `current_day = 0`, `days_completed = 0`
- Has **NO daily_flames rows** — the flame page is a placeholder, so Avg Confidence = "–"
- Profile.tsx crashes with `PGRST116` error (`.single()` on 0 rows)

This explains every symptom: Dashboard shows "Day 1 of 60", "0-day streak", "0/60 Days Complete", Journey shows all zeros.

## Fixes Required

### Fix 1 — Database: Attach the trigger + fix missing data

**Migration SQL:**

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Data fix (insert tool):** Create the missing profile and enrollment for Vansh's user ID, setting `current_streak = 2`, `days_completed = 2`, `current_day = 3`.

### Fix 2 — Remove free tier lock (all files)

Remove ALL `day <= 5` / `payment_status === "free"` lock logic from:

- **Dashboard.tsx**: Remove the lock overlay on today's lesson card (lines 205-218), remove `isLockedFree` logic in day grid (lines 297-298, 301-303, 357-365)
- **DayScreen.tsx**: Remove the free tier gate (lines 269-279)

### Fix 3 — Dashboard.tsx: Derive completedDays from progress as fallback

When enrollment is null/missing, count completed days from the progress table instead:

```tsx
const completedFromProgress = allProg?.filter(p => p.day_complete).length ?? 0;
setCompletedDays(enrollData?.days_completed ?? completedFromProgress);
```

Also fix `displayDay` to use progress-based calculation as fallback:

```tsx
const day = (enrollData?.current_day ?? 0) > 0
  ? enrollData.current_day
  : completedFromProgress + 1;  // fallback: next day after last completed
```

### Fix 4 — Profile.tsx: Use `.maybeSingle()` instead of `.single()`

Line 57: Change `.single()` to `.maybeSingle()` to prevent the `PGRST116` crash when no profile row exists. Add fallback to Google metadata for all fields.

### Fix 5 — DayScreen.tsx `completeDay()`: Handle missing enrollment

The `completeDay` function (line 222) does `UPDATE enrollments` but if no enrollment row exists, it silently updates 0 rows. Add upsert logic:

```tsx
const { data: existingEnroll } = await supabase
  .from("enrollments").select("id")
  .eq("user_id", user.id).eq("is_active", true).maybeSingle();
if (existingEnroll) {
  await supabase.from("enrollments").update({...}).eq("id", existingEnroll.id);
} else {
  await supabase.from("enrollments").insert({
    user_id: user.id, current_day: nextDay, days_completed: Number(dayNumber), is_active: true
  });
}
```

Same for the `profiles.current_streak` update — check if profile exists first.

### Fix 6 — Journey.tsx: Fallback for missing profile

The Journey page uses `.single()` (line 28) which will also crash if no profile exists. Change to `.maybeSingle()`.

## Summary of files to modify

1. **Database migration** — attach trigger to auth.users
2. **Database insert** — create missing profile + enrollment for Vansh
3. **Dashboard.tsx** — remove free tier locks, derive completedDays from progress as fallback
4. **DayScreen.tsx** — remove free tier gate, handle missing enrollment in completeDay()
5. **Profile.tsx** — `.maybeSingle()` + graceful fallback
6. **Journey.tsx** — `.maybeSingle()` for profile fetch

## Avg Confidence "–" explanation

This is correct behavior — no daily flames have been submitted (the flame page at `/flame/:dayNumber` is still a placeholder). The confidence rating comes from `daily_flames` table which has 0 rows. This will self-resolve once the flame feature is built.  
  
  
THE 3 THINGS THAT NEED CORRECTION:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THING 1 — Free tier lock was accidentally

removed in the last build.

Must be RESTORED, not removed.

THING 2 — Day cards must show correct

lock/unlock states:

FREE USER:

  Days 1-5 → accessible cards

  Day 6-60 → locked cards (🔒)

             tapping shows upgrade prompt

PAID USER:

  All 60 days → accessible

THING 3 — Replay rule:

  Card = in progress → "Continue →"

  Card = completed → "Completed ✦"

                     + "↺ Replay" option

  Card = not started → "Start →"

  Card = locked → 🔒 overlay, no tap  
  
This prompt corrects the free tier

logic that was accidentally removed.

Do NOT remove any free tier code.

Restore and strengthen it.

Files to modify:

1. DayScreen.tsx

2. Dashboard.tsx

Do NOT touch any other file.

═══════════════════════════════════════════

FIX 1 — DayScreen.tsx

Restore free tier gate — CORRECTLY

═══════════════════════════════════════════

FIND where the free tier gate was

commented out or removed.

RESTORE IT as follows:

After fetching enrollment data,

add this check:

  const isFreeUser =

    enrollment?.payment_status === "free"

    || enrollment?.payment_status === null

    || !enrollment;

  const isLockedDay =

    isFreeUser && Number(dayNumber) > 5;

  IF isLockedDay → show lock screen.

  Do NOT show any lesson content.

  Do NOT allow any step progression.

LOCK SCREEN UI:

  Full screen. Centered.

  bg-background.

  motion.div:

    initial: opacity 0, scale 0.9

    animate: opacity 1, scale 1

    transition: duration 0.4

  "🔒" text-6xl

    animate: translateY 0→-8px→0

    duration 2s, repeat infinite

  "Day {dayNumber} is Locked"

    font-display text-2xl font-bold

    text-primary text-center mt-6

  "You've completed your free preview.

   Upgrade to unlock all 60 days

   and continue your transformation."

    text-sm font-body text-foreground/50

    text-center mt-3 max-w-[280px]

    leading-relaxed

  Gold CTA button mt-8:

    "Unlock All 60 Days →"

    w-full bg-primary

    text-primary-foreground

    font-body font-semibold

    py-4 rounded-2xl text-base

    onClick: toast("Upgrade feature

      coming soon! Write to

      [contact@ujjwalbhavishya.co.in](mailto:contact@ujjwalbhavishya.co.in)")

  Text link below mt-4:

    "← Back to Home"

    onClick: navigate("/dashboard")

    text-sm font-body text-foreground/30

    underline ✦

═══════════════════════════════════════════

FIX 2 — Dashboard.tsx

Day card lock states — correct logic

═══════════════════════════════════════════

FIND the 60-day grid at the bottom

of Dashboard.

For each day card, determine state

using this exact priority order:

  const isFreeUser =

    enrollment?.payment_status === "free"

    || !enrollment;

  const isLocked =

    isFreeUser && [day.day](http://day.day)_number > 5;

  const dayProgress =

    getDayProgress([day.day](http://day.day)_number);

  const isCompleted =

    dayProgress?.day_complete === true;

  const isInProgress =

    dayProgress &&

    ![dayProgress.day](http://dayProgress.day)_complete;

  const isAccessible =

    !isLocked;

STATE PRIORITY:

  1. isLocked → LOCKED STATE

  2. isCompleted → COMPLETED STATE

  3. isInProgress → IN PROGRESS STATE

  4. isAccessible → NOT STARTED STATE

─────────────────────────────────────────

LOCKED STATE (days 6-60 for free users):

─────────────────────────────────────────

  glass-card opacity-60

  cursor-not-allowed

  TOP: "Day {[day.day](http://day.day)_number}"

    text-xs font-body text-foreground/30

  CENTER: "🔒"

    text-2xl text-foreground/20

  BOTTOM: "Upgrade to unlock"

    text-[10px] font-body

    text-foreground/20

  onClick:

    toast("Upgrade coming soon!

      Contact: [contact@ujjwalbhavishya.co.in](mailto:contact@ujjwalbhavishya.co.in)")

  Do NOT navigate anywhere. ✦

─────────────────────────────────────────

COMPLETED STATE:

─────────────────────────────────────────

  glass-card with gold border:

  border border-primary/40

  cursor-pointer

  TOP RIGHT: "✓" badge

    bg-primary/20 text-primary

    text-[10px] px-1.5 py-0.5

    rounded-full font-bold

  "Day {[day.day](http://day.day)_number}"

    text-xs font-body text-foreground/40

  Lesson title (no "Day X:" prefix):

    text-sm font-display font-semibold

    text-foreground line-clamp-2 mt-1

  BOTTOM: "Completed ✦"

    text-[10px] text-primary/60

  onClick: navigate("/day/" + [day.day](http://day.day)_number)

  (replay is available inside DayScreen) ✦

─────────────────────────────────────────

IN PROGRESS STATE:

─────────────────────────────────────────

  glass-card with pulsing gold dot

  cursor-pointer

  TOP RIGHT: pulsing dot

    w-2 h-2 rounded-full bg-primary

    animate-pulse

  "Day {[day.day](http://day.day)_number}"

    text-xs font-body text-foreground/40

  Lesson title:

    text-sm font-display font-semibold

    text-foreground line-clamp-2 mt-1

  MINI STEP DOTS (5 dots):

    flex gap-1 mt-2

    Each: w-1.5 h-1.5 rounded-full

    Done: bg-primary

    Pending: bg-foreground/20

    Based on: gamma_complete,

      gyani_complete, gyanu_complete,

      quiz_complete, day_complete

  BOTTOM: "Continue →"

    text-[10px] text-primary

  onClick: navigate("/day/" + [day.day](http://day.day)_number)

─────────────────────────────────────────

NOT STARTED STATE (accessible, not begun):

─────────────────────────────────────────

  glass-card cursor-pointer

  No special badge

  "Day {[day.day](http://day.day)_number}"

    text-xs font-body text-foreground/30

  Lesson title if available:

    text-sm font-display font-semibold

    text-foreground/70 line-clamp-2 mt-1

  If no lesson data yet:

    "Coming soon"

    text-xs text-foreground/20 mt-1

  BOTTOM: "Start →"

    text-[10px] text-foreground/30

  onClick:

    IF lesson exists for this day:

      navigate("/day/" + [day.day](http://day.day)_number)

    ELSE:

      toast("Day {[day.day](http://day.day)_number}

        content coming soon ✦")

═══════════════════════════════════════════

FIX 3 — Dashboard.tsx + DayScreen.tsx

Replay only after completion

═══════════════════════════════════════════

IN DayScreen.tsx:

The "↺ Replay Day {dayNumber}" button

on Step 6 is CORRECT — it only shows

after day_complete = true (step 6).

No change needed there.

IN Dashboard.tsx:

The COMPLETED STATE card already

navigates to /day/{dayNumber}.

Inside DayScreen, if day is completed,

it shows Step 6 with the Replay button.

Student taps Replay → restarts flow.

This means:

  Replay is gated behind completion ✅

  First visit always starts at Step 1 ✅

  Resume works for in-progress days ✅

  No replay without completion ✅

The flow is already correct

from the previous build.

Just ensure locked days cannot

be tapped at all. ✦

═══════════════════════════════════════════

RULES

═══════════════════════════════════════════

1. FREE TIER = days 1-5 free,

   days 6-60 locked. Always.

   This is the business model.

   Never remove this logic.

2. Locked cards are visually dimmed

   AND non-navigable.

   Tap = upgrade toast only.

3. Replay only accessible on

   completed days (Step 6 screen).

4. Lesson title shown on cards

   only if lessons table has data

   for that day_number.

   Days without lessons = "Coming soon"

5. All Supabase reads in try/catch.

   No crashes on missing data.

6. Do NOT change any auth flow.

   Do NOT change Onboarding.

   Do NOT change Profile.

   Do NOT change Journey. ✦

&nbsp;

  
