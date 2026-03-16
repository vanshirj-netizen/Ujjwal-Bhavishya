

# Fix: Score Scaling Bug in anubhav-evaluate

## Problem
Gemini sometimes returns pronunciation scores as decimals (0.0–1.0) instead of integers (0–100), resulting in near-zero scores being saved.

## Changes (single file: `supabase/functions/anubhav-evaluate/index.ts`)

### 1. Add `normalizeScore` helper (after line 23)
```ts
function normalizeScore(score: number): number {
  if (score === null || score === undefined) return 50;
  if (score <= 1.0 && score >= 0) return Math.round(score * 100);
  return Math.round(Math.min(100, Math.max(0, score)));
}
```

### 2. Apply normalization to score averaging (lines 293-295)
Replace direct averaging with `normalizeScore()` on each individual score before averaging.

### 3. Make prompt explicit about score range (line 189)
Add to the scoring instruction:
```
Score using integers from 0 to 100 (not decimals, not 0-1 scale).
Example: accuracyScore: 73, fluencyScore: 68, prosodyScore: 81
```

### 4. Add score logging before DB save (after line 320)
```ts
console.log('[anubhav-evaluate] Final scores:', avgWordClarity, avgSmoothness, avgNaturalSound,
  'transcripts:', transcriptSentences?.substring(0, 50));
```

No other changes.

