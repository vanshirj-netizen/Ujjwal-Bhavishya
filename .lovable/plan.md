

# Extend Onboarding Flow — Steps 4-8 + Database Schema

## Overview
Add 5 new onboarding steps (Personal Details, Your Roots, Your World, Your North Star, Promise + Consent) to `Onboarding.tsx`, and create the supporting database tables and columns.

## Part 1 — Database Migration

A single migration that:

1. **Add 18 new columns to `profiles`** (date_of_birth, gender, country, mother_tongue, childhood_state, mti_zone, mti_profile_type, mti_primary_zone, mti_secondary_zone, chosen_world, primary_goal, whatsapp_opted_in, consent_given, consent_timestamp, age_verified, parental_consent, is_under_18, onboarding_step, photo_url) — all with `ADD COLUMN IF NOT EXISTS`

2. **Add missing columns to existing `user_roles`** table (assigned_by, assigned_at, is_active) — not recreate it

3. **Create 7 new tables**: enrollments, weeks, transformation_scores, student_errors, certificates, shabd_shakti, shabd_shakti_progress — all with `CREATE TABLE IF NOT EXISTS`

4. **Enable RLS** on all new tables + add SELECT policies for user-owned data

**Key consideration**: The existing `user_roles` table references `auth.users`, not `profiles`. We will NOT recreate it — just add the missing columns. The enrollments and other new tables will reference `profiles(id)` as specified.

Also need INSERT/UPDATE policies on `enrollments` and `user_roles` so the handleFinish upsert works.

## Part 2 — Onboarding.tsx Changes

Only file modified: `src/pages/Onboarding.tsx`

1. **Step 3 button**: Change `onClick={handleFinish}` to `onClick={nextStep}`, remove saving state from button disabled/text

2. **New state variables**: 15 new useState declarations for all form fields (dob, gender, country, motherTongue, childhoodState, MTI fields, chosenWorld, primaryGoal, consent fields)

3. **Add `detectMTIZone` function**: Maps mother tongue + childhood state to MTI zone classification

4. **Replace `handleFinish`**: New version saves all profile fields, upserts user_roles, upserts enrollments, then navigates to dashboard

5. **Add 5 new step JSX blocks** (steps 4-8) inside the existing AnimatePresence — using the exact JSX provided with the existing design system classes (glass-card, glass-card-gold, gold-text-glow, gold-shimmer-btn, font-display, font-body)

Each step has: back button, progress dots (5 dots for steps 4-8), content, and continue button with validation.

## TypeScript Note
Since the new columns/tables won't be in the auto-generated types until the migration runs and types regenerate, we'll use `.update()` with type assertions where needed for the new profile columns.

