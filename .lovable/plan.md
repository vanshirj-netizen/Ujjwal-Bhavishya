# Anubhav Mic Input + DayScreen Practice Card

## 1. AnubhavPage.tsx — Dual Input (Mic + Text)

Add two state variables (`isListening`, `recognitionRef`) and two functions (`startListening`, `stopListening`) using the Web Speech API with `lang = "en-IN"`.

Replace the textarea block (lines 366-374) with:

- **Big mic button** — primary action, 3 visual states (idle/listening/has-transcript)
- **"— or type below —" divider**
- **Smaller textarea fallback** (min-h-[60px])
- Submit button stays the same

## 2. DayScreen.tsx — Anubhav Practice Card

**Step 6 celebration screen** (line 354, after the Daily Flame card and before the "Up Next" card): Insert an Anubhav practice card:

```
glass-card-gold p-5 rounded-3xl border border-primary/30
🎯 "Practice with {masterName}" + subtitle + "10 sentences · Scored · Live AI"
onClick → navigate(`/anubhav/${dayNumber}`)
```

This card is always visible on Step 6 for both completed and replayed days. Since Step 6 is the only "result" view in DayScreen (the in-progress steps 1-5 are the learning flow itself), placing it here is the right location. Practice is accessible any time the student reaches completion.

## Files Modified

1. `src/pages/AnubhavPage.tsx` — mic input system
2. `src/pages/DayScreen.tsx` — Anubhav card on Step 6  
  
Updated flow:  
In DayScreen.tsx, the Anubhav
  practice card should appear ONLY
  on Step 6 (the completion/result screen).
  Do NOT show it on Steps 1 through 5.
  Do NOT show it on locked days.
  Step 6 is reached only when:
    a) Student just completed the day
    b) Student is replaying a past day
  In BOTH cases — Anubhav card is visible.
  It will not be be visible for the locked days and incompleted days.
  &nbsp;