

# Fix Master Photo Display — Onboarding Step 3

## Changes — `src/pages/Onboarding.tsx` only

### Image container (lines 280-288)
- Change container from `w-20 h-20` (80×80) to `w-full h-[200px]` (full card width, fixed 200px height)
- Keep `rounded-2xl overflow-hidden mb-3 border-2`
- For Gyani's `<img>`: use `object-position: center 30%` to show full turban+face
- For Gyanu's `<img>`: keep default `object-position: center`
- Both images keep `w-full h-full object-cover`

### Implementation
Replace the single `<img>` tag with conditional `style` based on `m.key === "Gyani"`:
```tsx
<img src={m.img} alt={m.key} 
  className="w-full h-full object-cover" 
  style={m.key === "Gyani" ? { objectPosition: "center 30%" } : undefined} 
/>
```

No other changes to styling, logic, or other screens.

