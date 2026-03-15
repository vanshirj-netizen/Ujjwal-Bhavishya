

# Fix anubhav-evaluate Edge Function — 7 Targeted Fixes

All changes are confined to `supabase/functions/anubhav-evaluate/index.ts`. No other files change.

## Changes

### Fix 1 — Parallel Azure calls
Replace the sequential `if (session.audio_sentences_path) { ... } if (session.audio_freespeech_path) { ... }` blocks (lines 153-181) with:
- Download both audio files first
- Run `Promise.all([assessPronunciation(..., "sentences"), assessPronunciation(..., "freespeech")])` for parallel execution

### Fix 2 — Startup secret validation
At the top of the `serve` handler (after OPTIONS check, before JWT), validate `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, and `ANUBHAV_MASTER_PROMPT` are present. Return 500 with `{ error: "Missing required secret: X", step: "startup_validation" }` if any is missing.

### Fix 3 — Fix Pronunciation Assessment header
Replace current header config (lines 34-40) with:
```js
const pronunciationConfig = {
  ReferenceText: "",
  GradingSystem: "HundredMark",
  Granularity: "Word",
  EnableMiscue: true,
  ScenarioId: ""
};
const pronunciationHeader = btoa(JSON.stringify(pronunciationConfig));
```
Removes `EnableProsodyAssessment: true` (not a valid Azure parameter), adds `ScenarioId: ""`.

### Fix 4 — Audio format detection from path
Add helper function:
```js
function getAudioContentType(path: string): string {
  const pathLower = path.toLowerCase();
  if (pathLower.endsWith('.mp4') || pathLower.endsWith('.m4a')) return 'audio/mp4';
  return 'audio/webm;codecs=opus';
}
```
Use this instead of inline `.endsWith(".mp4")` checks.

### Fix 5 — Step-by-step logging
Add `console.log('[anubhav-evaluate] Step N: ...')` at every major step: auth verified, data fetched, audio paths, download sizes, Azure call start, Azure response status, transcripts received, Gemini call start, save to DB.

### Fix 6 — Visible Azure failures
Add `azureFailed` and `azureFailReason` to the `assessPronunciation` return type. When Azure returns non-200, log the full error and set these fields. Include `azure_failed` and `azure_fail_reason` in the response JSON so the frontend can show "Pronunciation scores unavailable" instead of fake 50s. Also add these fields to the catch-all error response.

### Fix 7 — Validate audio blob size
After downloading both audio files, check `byteLength < 1000`. If either is too small, return 422 with `{ error: "Audio file missing or empty", step: "audio_download", path: ... }`.

## Not Changed
- Response JSON schema (only two new optional fields added: `azure_failed`, `azure_fail_reason`)
- Gemini prompt and tool-calling structure
- Database save logic
- Auth/JWT verification
- Data fetch logic for `anubhav_writings` and `anubhav_practice_sessions`

