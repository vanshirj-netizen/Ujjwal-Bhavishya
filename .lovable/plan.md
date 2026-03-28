

# Quote of the Day (QOD) System

## Overview
Create a daily quote system with a new database table, edge function for AI-generated Gyani messages, and a full-screen immersive overlay card on the Dashboard.

## 1. Database — New `daily_quotes` Table

Create table with columns:
- `id` (uuid, PK)
- `day_number` (integer, unique, not null) — maps to the course day
- `quote_text` (text, not null)
- `quote_author` (text, not null)
- `created_at` (timestamptz, default now())

RLS: authenticated users can SELECT only. No insert/update/delete from client.

Seed row: Day 1 — "It does not matter how slowly you go as long as you do not stop." — Confucius

Also create a `qod_responses` table to cache generated Gyani messages per user per day:
- `id` (uuid, PK)
- `user_id` (uuid, not null)
- `day_number` (integer, not null)
- `line_1` (text), `line_2` (text), `line_3` (text) — the 3-move response
- `quote_text` (text), `quote_author` (text)
- `created_at` (timestamptz, default now())
- Unique constraint on `(user_id, day_number)`

RLS: users can SELECT and INSERT their own rows only.

## 2. Edge Function — `generate-qod-message`

**Input**: `{ firstName, quote_text, quote_author }`

**Logic**:
1. JWT auth (same pattern as existing functions)
2. Fetch Gyani personality from `ai_personalities` table where `master_name = 'gyani'` and `context = 'qod'`
3. Call Lovable AI Gateway (`google/gemini-2.5-flash`) with personality as system prompt
4. User prompt asks Gyani to deliver the quote in exactly 3 lines (the "3-move response")
5. Return `{ line_1, line_2, line_3 }` as JSON
6. Handle 429/402 errors, 3-second timeout fallback

## 3. Dashboard — QOD Full-Screen Overlay

**Trigger logic** (in `Dashboard.tsx`):
- On load, check `sessionStorage.getItem('qod_shown_date')`
- If matches today's date (IST) → skip
- If new day → check `qod_responses` table for today's cached response
  - If cached → show overlay with cached lines (no AI call)
  - If not cached → call `generate-qod-message` edge function, save response to `qod_responses`, then show overlay

**New component**: `src/components/QodOverlay.tsx`

**Design**:
- Fixed full-screen overlay, dark background (`rgba(0,10,6,0.97)`)
- Gyani avatar centered at top (small, subtle, gold border)
- Gold text, lines fade in sequentially (0.8s delay per line)
- After last line: 4-second forced pause (no buttons, no X, no skip)
- Then fade in: "Carry this with you today." (subtle, smaller text)
- Then fade in: `[ I will. ]` gold button
- On tap: save today's date to `sessionStorage('qod_shown_date')`, dismiss overlay

**Fallback**: If edge function fails or takes > 3 seconds, show raw `quote_text` + `quote_author` directly with same design/pause/button (no 3-line split).

## 4. Dashboard Wisdom Card Update

The existing "YOUR DAILY WISDOM" card on Dashboard will now pull `quote_text` and `quote_author` from the `daily_quotes` table (matched by `displayDay`) instead of from the `lessons` table. Always show Gyani avatar and name regardless of selected master.

## 5. Daily Reset at 05:30 AM IST

The quote changes based on `day_number` which maps to the user's current day in their journey. The "daily refresh" is handled by:
- `sessionStorage('qod_shown_date')` resets naturally each new calendar day
- The `daily_quotes` table has a row per day — as the user progresses, they get the next day's quote automatically

No cron job needed — the day progression already exists in the app logic.

## Technical Details

**Files to create**:
- `supabase/migrations/[timestamp]_create_daily_quotes.sql` — tables + RLS + seed data
- `supabase/functions/generate-qod-message/index.ts` — edge function
- `src/components/QodOverlay.tsx` — full-screen overlay component

**Files to modify**:
- `src/pages/Dashboard.tsx` — add QOD trigger logic, import overlay, update wisdom card to use `daily_quotes` table and always show Gyani

**AI personality row needed**: Insert into `ai_personalities` a row with `master_name = 'gyani'`, `context = 'qod'` with a personality prompt for quote delivery.

