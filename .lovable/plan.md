# Ujjwal Bhavishya — Phase 1 Implementation Plan

## Overview

Build the core student experience for the "Ujjwal Bhavishya" luxury EdTech platform — a 60-day English mastery course called Aarambh. Deep sacred green (#01271d) + gold (#fed141) + cream (#fffcef) luxury aesthetic throughout.

**Important security note:** User roles (student/coach) will be stored in a separate `user_roles` table per security best practices, not on the users/profiles table.

---

## Phase 1A: Foundation & Design System

### 1. Brand Design System

- Set all CSS variables to the exact UB color palette (deep green background, gold primary, cream text)
- Import Google Fonts: Playfair Display (headings) + Inter (body)
- Create glassmorphism card component with backdrop blur and gold border
- Install Framer Motion for animations
- Install html2canvas + jsPDF for future certificate feature
- Define all animation variants (fade-up, scale, ripple, particle burst)
- Mobile-first layout with bottom navigation bar (48px+ tap targets, iOS safe areas)

### 2. Splash Screen

- Full green background with centered UB logo + gold glow pulse
- "Ujjwal Bhavishya — Bright Future" tagline in Playfair Display
- Rising butterfly animation, auto-navigates to login after 2.8s

---

## Phase 1B: Authentication & Onboarding

### 3. Database Setup (Lovable Cloud / Supabase)

- Tables: profiles, user_roles, courses, lessons (seeded with 5 sample days), progress, daily_flames, coach_notes
- UB Student ID auto-generation via database sequence (UB-000001 format)
- Row Level Security: students access only own data, coaches read all student data
- Storage bucket for audio recordings

### 4. Login / Sign Up Screen

- Animated tab toggle: "New Student" / "Welcome Back"
- Email + password auth (no social login)
- Gold "Begin My Journey →" CTA with "Days 1–5 are FREE" note
- Forgot password flow
- Gold bokeh dot background effect

### 5. Three-Step Onboarding (shown once after signup)

- Step 1: Welcome with UB ID display (large monospace, tap-to-copy)
- Step 2: Choose Your Guru — Gyani (Wisdom) vs Gyanu (Hacks) selection cards
- Step 3: Journey overview with staggered icon animations → "Start Day 1 →"
- Progress dots at bottom

---

## Phase 1C: Core Student Experience

### 6. Dashboard (Home Screen)

- Greeting: "Namaste, [Name] 👋" with day count + streak
- Animated circular progress ring (gold, X/60 days)
- Today's Lesson card with 4 checkpoint mini-icons (gold when done)
- Horizontal scrolling course cards (Aarambh active, 3 "Coming Soon" dimmed)
- 60-Day Grid: 6×10 circles showing completed/today/unlocked/locked states
- Bottom navigation: Home | Journey | Flame | Profile

### 7. Lesson Detail Page (/lesson/[day])

- 7 sequential content blocks, each as a glassmorphism card:
  - Day header with 5-dot progress
  - Gamma slides link + checkbox
  - Gyani YouTube embed + checkbox
  - Gyanu YouTube embed + checkbox
  - Wayground quiz iframe with UB ID copy helper + checkbox
  - Anubhav speaking practice sentence + checkbox
  - Daily Flame submit CTA (or completion state)
- Sticky progress bar at bottom
- Free users: Days 1–5 full access; Day 6+ triggers upgrade modal
- YouTube fallback link if embed blocked

### 8. Daily Flame Form (/flame/[day])

- Written reflection textarea (min 100 chars, gold focus border)
- Audio recording: large gold mic button with recording/playback states, countdown timer
- Confidence slider (1–10) with dynamic emoji labels
- "Today I spoke about ___" single line input
- Optional "Biggest challenge" textarea
- Submit → full-screen gold particle celebration with streak animation
- Block duplicate submissions per day

### 9. Upgrade Modal (Paywall)

- Triggers on any Day 5+ tap for free users
- Full-screen overlay with gold-bordered feature list card
- "₹1999 — Full 60-Day Access" with "Unlock My Future →" button
- Opens external Razorpay URL in new tab
- "← Not now" dismiss option

### 10. Journey / Progress Page (/journey)

- 4 stat cards: streak, flames submitted, avg confidence, days active
- Confidence line chart (Recharts, gold line on green background)
- Vertical timeline of completed days with mini confidence bars
- Locked upcoming days shown below

### 11. Profile Page (/profile)

- Avatar (initials-based), name, UB ID, selected master badge
- Enrollment date + payment status badge
- Stats summary card
- Upgrade CTA for free users
- Change password + sign out

---

## Phase 2 (Follow-up after Phase 1 is stable)

### Coach Dashboard (/coach/dashboard)

- Separate coach login and protected route
- Student table with sortable columns (name, UB ID, day, status, streak, confidence)
- Quick filters: Needs Attention, On Fire, Pending Today
- Student detail drawer: full flame history, audio playback, confidence chart, private notes

### Completion Certificate (Day 60)

- Auto-triggered on Day 60 flame submission
- Elegant certificate design (green bg, gold ornamental border, butterfly watermark)
- Download as PDF (html2canvas + jsPDF) + Share as Image
- Gold particle celebration on first view

---

## Key Technical Decisions

- **Roles in separate table** (user_roles) — not on profiles, for security
- **Audio recording** via browser MediaRecorder API, stored in Supabase Storage
- **Framer Motion** for all animations (page transitions, celebrations, hover effects)
- **Bottom nav** only (no top navbar) — mobile-first
- **Placeholder lesson data** seeded for Days 1–5
- **No payment processing** — Razorpay is external URL only