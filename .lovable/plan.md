

# Fix: Pronunciation Assessment ReferenceText

## Root Cause
Azure returns 400 because `EnableMiscue: true` with `ReferenceText: ""` is invalid. Miscue detection requires text to compare against.

## Changes (single file: `supabase/functions/anubhav-evaluate/index.ts`)

### 1. Add `referenceText` parameter to `assessPronunciation`
Line 35: add `referenceText: string` parameter.

### 2. Use dynamic pronunciationConfig
Lines 47-53: replace hardcoded empty `ReferenceText` and `EnableMiscue: true` with:
```js
const pronunciationConfig = {
  ReferenceText: referenceText,
  GradingSystem: "HundredMark",
  Granularity: "Word",
  EnableMiscue: referenceText.length > 0,
  ScenarioId: "",
};
```

### 3. Build reference text from written sentences
Before Azure calls (~line 236), add:
```js
const sentencesReferenceText = writtenSentences.filter(Boolean).join(' ');
```

### 4. Pass reference text to each call
- Sentences call (line 242): pass `sentencesReferenceText`
- Freespeech call (line 249): pass `""` (no reference text)

### 5. Update Step 5 log
Add `referenceText length` to the existing log line.

No other changes.

