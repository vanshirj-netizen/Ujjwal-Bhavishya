

# Fix: Privilege Escalation on Enrollments Table

## Problem
The `users_update_own_safe_columns` UPDATE policy grants unrestricted column access, letting users modify `payment_status`, `payment_amount`, etc. directly.

## Changes

### 1. Database Migration
- Drop the `users_update_own_safe_columns` UPDATE policy on `enrollments`
- Create `update_own_enrollment_safe` SECURITY DEFINER function accepting only: `p_enrollment_id`, `p_trial_completed`, `p_current_day`, `p_days_completed` (skip `p_last_active_at` — column doesn't exist on table)
- Function verifies `auth.uid()` owns the enrollment, then updates only those columns
- Grant EXECUTE to `authenticated` only

### 2. Code Changes (2 files)

**`src/pages/DayScreen.tsx`** (line 227):
Replace `supabase.from("enrollments").update({...}).eq(...)` with:
```ts
await supabase.rpc('update_own_enrollment_safe', {
  p_enrollment_id: existingEnroll.id,
  p_current_day: nextDay,
  p_days_completed: Number(dayNumber),
});
```

**`src/pages/FlamePage.tsx`** (lines 338-341):
Replace `supabase.from("enrollments").update({...}).eq(...)` with:
```ts
await supabase.rpc('update_own_enrollment_safe', {
  p_enrollment_id: enroll.id,
  p_current_day: nextDay,
  p_days_completed: Number(dayNumber),
});
```

No other files update enrollments. Edge functions don't touch enrollments via client calls.

