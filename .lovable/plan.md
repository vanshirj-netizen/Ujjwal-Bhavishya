

# Revert Splash Logo to Static PNG with Breathing Pulse

## Changes — `src/pages/Splash.tsx` only

1. **Line 7**: Replace `LOGO_GIF` constant URL with `https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media/UB-Logo.png`
2. **Lines 91-97**: Replace the static `<img>` with a `<motion.img>` that:
   - Uses the new PNG URL
   - Size: `w-[180px] h-[180px]` (down from 280)
   - `object-contain`
   - `box-shadow: 0 0 40px rgba(254,209,65,0.4)`
   - Animate: `scale: [1, 1.05, 1]` with `duration: 2, repeat: Infinity, ease: "easeInOut"` — gentle breathing pulse

Everything else (background, text, progress bar, butterflies, routing) remains untouched.

