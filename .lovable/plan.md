

# Replace Azure Speech with Gemini Audio Analysis in anubhav-evaluate

## What changes

Replace the entire Azure pronunciation assessment pipeline with a single Gemini 2.0 Flash multimodal call that receives both audio files as base64 inline data and returns structured scores + transcripts.

## Detailed changes (single file: `supabase/functions/anubhav-evaluate/index.ts`)

### Remove
- `translateErrorType` function (lines 10-20)
- `getAudioContentType` function (lines 22-28)
- `assessPronunciation` function (lines 30-110)
- `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` from startup validation (line 118) and variable reads (lines 153-154)

### Add
- `bufferToBase64(buffer: ArrayBuffer): string` helper — converts ArrayBuffer to base64 string using `btoa`
- `getAudioMimeType(path: string): string` helper — returns `audio/mp4` for .mp4/.m4a, `audio/webm` otherwise (needed for the `data:` URI)

### Replace Azure calls (lines 236-271) with Gemini audio evaluation
Single `fetch` to `https://ai.gateway.lovable.dev/v1/chat/completions` with:
- Model: `google/gemini-2.0-flash`
- User message containing:
  1. Text prompt with MTI zone, reference sentences, scoring instructions
  2. Two `image_url` parts with `data:{mimeType};base64,{base64data}` for each audio file
- Tool calling to force structured JSON output with schema:
  - `sentences.transcript`, `sentences.accuracyScore/fluencyScore/prosodyScore`, `sentences.wordErrors[]`
  - `freespeech.transcript`, `freespeech.accuracyScore/fluencyScore/prosodyScore`, `freespeech.wordErrors[]`

### Map Gemini response to existing variable names
```text
avgWordClarity  = round((sentences.accuracyScore + freespeech.accuracyScore) / 2)
avgSmoothness   = round((sentences.fluencyScore + freespeech.fluencyScore) / 2)
avgNaturalSound = round((sentences.prosodyScore + freespeech.prosodyScore) / 2)
transcriptSentences  = sentences.transcript
transcriptFreespeech = freespeech.transcript
allErrors = [...sentences.wordErrors, ...freespeech.wordErrors].slice(0, 5)
```

### Update startup validation
Only check: `ANUBHAV_MASTER_PROMPT`, `LOVABLE_API_KEY`

### Update logging
- Step 5: "Gemini audio evaluation starting" instead of "Azure calls starting"
- Step 6-7: replaced with single "Gemini audio response status" log
- Step 8: same transcript log

### Preserve exactly
- Response JSON schema (same fields including `azure_failed`/`azure_fail_reason` renamed conceptually but kept for backward compat as `audio_eval_failed`/`audio_eval_fail_reason` — actually keep exact field names `azure_failed`/`azure_fail_reason` for schema compat)
- DB save logic (lines 375-386)
- Gemini feedback call (lines 305-371)
- Auth/JWT verification
- Data fetch logic
- Catch-all error response

### Handle missing audio gracefully
If only one audio file exists, send only that one to Gemini with adjusted prompt. If neither exists, use fallback scores with `azure_failed: true`.

