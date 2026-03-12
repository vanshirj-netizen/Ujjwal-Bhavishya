

# Auto-Speak Feedback in AnubhavPage

## Approach

Reuse the existing `generate-flame-voice` edge function (already deployed, handles ElevenLabs + voice ID selection server-side) instead of calling ElevenLabs directly from the client. This keeps API keys secure and follows the same pattern as FlamePage.

## Changes — `src/pages/AnubhavPage.tsx` only

1. **Add `speakFeedback` function** (after `stopListening`, before `fetchSentences`):
   - Calls `supabase.functions.invoke("generate-flame-voice", { body: { text, masterName } })`
   - If `audioBase64` returned, plays via `new Audio(data:audio/mpeg;base64,...)`
   - Falls back to browser `SpeechSynthesis` (lang `en-IN`, rate 0.85) if ElevenLabs fails
   - Silently catches all errors — text feedback always visible

2. **Call `speakFeedback`** on line 146, right after setting feedback state:
   ```
   speakFeedback(result.feedback);
   ```

No new files. No new secrets. No new edge functions. Reuses existing `generate-flame-voice`.

