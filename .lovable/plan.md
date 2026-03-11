

# Complete Build — userContext + Onboarding/Profile/Journey Fixes

## Files to Create/Modify

### 1. Create `src/lib/userContext.ts` (NEW)
Three exported functions exactly as specified:
- `fetchFreshUserContext` — queries profiles, enrollments, lessons, progress, student_errors, transformation_scores, daily_flames, coach_notes, training_plan
- `buildSystemPrompt` — builds personalized system prompt from context (master persona, world context, MTI, curriculum gate, errors, scores, flames, coach notes, training plan)
- `saveSessionSummary` — writes to learning_sessions, student_errors, transformation_scores, training_plan with silent fail

### 2. `src/pages/Onboarding.tsx` — Welcome Name Fix
Current line 301: `Namaste, {fullName} 🙏` — uses `fullName` from profile fetch which defaults to "Student".

Changes:
- Add `welcomeName` state (default `""`)
- Add useEffect to fetch first name from profile + user metadata fallback chain
- Replace line 301 with `Namaste, {welcomeName || "Friend"}` (no 🙏 emoji)

All other onboarding fixes (dropdowns, multi-select, promise cards, toast links) are **already implemented** in the current code.

### 3. `src/pages/Profile.tsx` — 3 Fixes

**Fix A — displayName state for Google users:**
- Add `const [displayName, setDisplayName] = useState("Student")`
- After profile fetch (line 59), compute from `profileData?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Student"`
- Replace `fullName` (line 154) and `initials` (line 159) usage with `displayName`
- Update lines 192-194 to use `displayName`

**Fix B — Master top card reactive:**
- Line 156: Remove `const master = profile?.selected_master ?? "gyani"`
- Line 197: Change `master === "gyani"` to `selectedMasterLocal === "gyani"`

**Fix C — Master modal styling:**
- Line 320: Add `style={{ backgroundColor: '#01271d', border: '1px solid rgba(254,209,65,0.3)' }}`
- Line 335: Update image container className to `w-full h-32 rounded-xl overflow-hidden bg-foreground/10 border border-primary/30 flex items-center justify-center`
- Line 336: Add `onError` handler and `style={{ objectFit: 'cover', objectPosition: 'top' }}`

### 4. `src/pages/Journey.tsx` — Personalized Heading
- Add imports: `useState, useEffect` from react, `supabase` client
- Add `journeyName` state (default `"Your"`)
- Add useEffect to fetch profile name with metadata fallback, extract first name, append `'s`
- Replace line 50 `Your Journey 🦋` with `{journeyName} Journey 🦋`

### 5. AI Coaching Component
No AI coaching component currently exists in the codebase. The `userContext.ts` functions will be created and ready for integration. Console scaffold logs will be included in comments showing how to wire `handleSendMessage` and `handleEndSession` when the chat component is built.

