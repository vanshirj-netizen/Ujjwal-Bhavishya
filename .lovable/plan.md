

# Anubhav Session — Complete Fix (All 4 Issues)

Two files modified. No new files. No new packages.

## File 1: `src/pages/AnubhavPage.tsx`

### A. Add state variables (after line 20)
Add `interimTranscript` state and `responseRef` ref alongside existing state.

### B. Replace `startListening` (lines 53-76)
- `continuous = true`, `interimResults = true`
- Reset `response`, `responseRef.current`, `interimTranscript` before recording
- `onresult`: loop through results, accumulate final text into `responseRef.current` + `setResponse`, show interim in `setInterimTranscript`
- `onend`: clear interim, no auto-submit

### C. Replace `stopListening` (lines 78-81)
Add `setInterimTranscript("")` to reset.

### D. Replace `submitResponse` (lines 151-211)
- Accept optional `directInput` param
- Use `(directInput || responseRef.current || response).trim()` as input
- Same coach invocation logic
- `speakFeedback` called without await (fire-and-forget)

### E. Update `nextSentence` (lines 213-218)
Add `responseRef.current = ""` and `setInterimTranscript("")` resets.

### F. Replace mic + input UI (lines 439-491)
- Big mic button with 3 states (idle/listening/has-transcript)
- Live transcript box showing final + interim text
- "— or type below —" divider
- Smaller textarea that syncs both `response` and `responseRef.current`
- Submit button disabled while listening, shows "Gyani is thinking..." or "Stop speaking first"

## File 2: `supabase/functions/anubhav-coach/index.ts`

### Replace prompt (lines 36-70)
Shorter prompt (~300 tokens) with critical speech-to-text rules:
- Never penalize missing punctuation/capitalization
- Evaluate only grammar structure, keywords, MTI errors
- Generous scoring (score 3 if grammar correct despite no punctuation)
- 2 sentences max feedback
- Same tool-calling structure kept (no changes to the API call shape)

## Summary
1. `responseRef` tracks transcript reliably
2. `continuous + interimResults = true` for live word-by-word display
3. Prompt ignores punctuation from speech-to-text
4. `speakFeedback` fire-and-forget — text appears instantly

