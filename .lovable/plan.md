

# Fix Profile Hero — Responsive Logo Size & Background Height

The user wants the logo to be **larger** and the hero background to be slightly **smaller/tighter** across phone, tablet, and laptop.

## Changes — `src/pages/Profile.tsx`

1. **Logo image** (line 149): Increase width from `w-[55%] max-w-[320px]` to `w-[65%] max-w-[400px]` so it's bigger on all devices.

2. **Hero container height** (line 126): Change fixed `200px` to a responsive approach — keep it compact. Use `160px` on mobile, scaling up slightly on larger screens via Tailwind classes instead of inline style. Replace `height: "200px"` with className `h-[160px] sm:h-[180px] lg:h-[200px]` and remove the inline height.

