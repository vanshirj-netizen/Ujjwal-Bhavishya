

# Targeted Fixes — Onboarding.tsx + Profile.tsx

## Onboarding.tsx Changes

### Fix 1 — Dropdown dark backgrounds (Step 5)
Add `style={{ backgroundColor: '#01271d', color: '#fffcef' }}` to all three `<select>` elements and their `<option>`/`<optgroup>` children in step 5 (lines 505-555).

### Fix 2 — World selection multi-select (Step 6)
- Change state: `chosenWorld` (string|null) → `chosenWorlds` (string[])
- Toggle logic on click, check `.includes()` for styling, `.length === 0` for disabled
- Add "Select one or both" subtitle
- In handleFinish: `chosen_world: chosenWorlds.join(',')`

### Fix 3 — Goal selection multi-select (Step 7)
- Change state: `primaryGoal` (string|null) → `primaryGoals` (string[])
- Same toggle/includes/length pattern
- Change heading to "What are your goals?" + add "Select all that apply"
- In handleFinish: `primary_goal: primaryGoals.join(',')`

### Fix 4 — Promise cards (Step 8)
- Remove subtitle line (line 666)
- Replace promise array: all three use "✦" symbol, second card body changed to the new text (no refund mention)

### Fix 5 — Privacy/Terms links (Step 8)
- Replace `<a href="/privacy">` and `<a href="/terms">` with `<button>` elements that call `toast()` with the message about policies being finalised

## Profile.tsx Changes

### Fix 6 — Settings expansion
- Add new state variables for master modal, world display, whatsapp toggle, etc.
- Expand profile SELECT query to include `chosen_world, whatsapp_opted_in, mother_tongue, childhood_state`
- Add `saveMaster` and `saveWhatsapp` functions
- Replace the settings section with: Preferences (master, world toggle, whatsapp toggle, background info) + Account (change password, sign out)
- Add master selection modal at end of JSX

