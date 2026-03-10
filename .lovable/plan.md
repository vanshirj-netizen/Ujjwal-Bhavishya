

# Final Media Integration Pass

## Summary
Replace all placeholder logos/images with real media assets across 4 files. No routing, database, or auth changes.

## Changes

### 1. `src/pages/Splash.tsx` — Gateway Loader upgrade
- Replace the static UB text logo (lines 96-102) with an `<img>` tag using the animated GIF URL: `https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo-GIF.gif`
- GIF: 280×280px, centered, with `box-shadow: 0 0 40px rgba(254,209,65,0.4)` gold glow
- Remove the scale/opacity pulse animation wrapper (the GIF itself is animated)
- Add radial gradient spotlight behind GIF: `radial-gradient(circle, rgba(254,209,65,0.08), transparent 70%)`
- Update text: add `tracking-[0.05em]` and `text-lg` (18px) styling, fade in with 0.3s delay
- Progress bar + counter: fade in simultaneously with the text (0.3s delay)
- Butterflies unchanged (already 5 with stagger + opacity fade)

### 2. `src/pages/Onboarding.tsx` — Video URL + Namaste logo + Master photos

**Video (Step 0, line 7):**
- Update `VIDEO_URL` to `https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB_Welcome_Video.mp4`
- Change `object-contain` to `object-cover` on the video element (line 112)

**Namaste (Step 1, lines 143-188):**
- Add UB logo image above the ✦ stars: `<img src="https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo.png" />` at 80×80px with gold glow pulse animation

**Choose Master (Step 3, lines 247-249):**
- Replace Gyani image URL: `https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/Gyani.webp`
- Replace Gyanu image URL: `https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/Gyanu.webp`
- Change image container from `rounded-full` to `rounded-2xl` (16px border-radius)
- Add gold border: `border-2 border-primary` always visible
- Selected state: add `box-shadow: 0 0 20px rgba(254,209,65,0.6)` glow
- Unselected (when other selected): `opacity-60`

### 3. `src/pages/Dashboard.tsx` — Horizontal logo in header
- Replace the text "Namaste, {firstName} 👋" heading area (line 59) with:
  - Horizontal logo image: `https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo-Horizontal.png` at height 32px, width auto, left-aligned
  - Keep the greeting text below it as a subtitle

### 4. `src/components/BottomNav.tsx` — No logo present, no change needed

## Asset URLs (all final)
- GIF logo: `https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo-GIF.gif`
- Static logo: `https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo.png`
- Horizontal logo: `https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo-Horizontal.png`
- Video: `https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB_Welcome_Video.mp4`
- Gyani: `https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/Gyani.webp`
- Gyanu: `https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/Gyanu.webp`

