

# Fix: Update model name from `gemini-2.0-flash` to `gemini-2.5-flash`

## Root Cause
The Lovable AI gateway no longer supports `google/gemini-2.0-flash`. The allowed model list includes `google/gemini-2.5-flash`.

## Change
Single line change in `supabase/functions/anubhav-evaluate/index.ts`:

- **Line 215**: Change `"google/gemini-2.0-flash"` to `"google/gemini-2.5-flash"`

No other changes needed. The rest of the function (tool calling schema, response parsing, DB save) all work correctly — the only failure point is the invalid model name.

