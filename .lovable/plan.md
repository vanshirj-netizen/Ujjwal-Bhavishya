

# Responsive Video Source Fix

## What changes
**File:** `src/pages/Onboarding.tsx`

1. Add a desktop video URL constant (line 8 area):
   ```
   const VIDEO_URL_DESKTOP = "https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media//UB_Welcome_Video_Desktop.mp4";
   ```

2. Use `useIsMobile`-style check or state to pick the right video. Since `<source media="">` is unreliable for `<video>`, use a React state approach:
   - Add state: `const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)`
   - Add resize listener in existing useEffect
   - Compute `const videoSrc = isDesktop ? VIDEO_URL_DESKTOP : VIDEO_URL`

3. Replace the video element (lines 112-121):
   - Remove `src={VIDEO_URL}` attribute
   - Set `src={videoSrc}` instead
   - Change className back to `object-cover` for both (no more `md:object-contain`) since each video matches its screen aspect ratio
   - Keep `key={videoSrc}` on the video element so React remounts on source change

## No other changes
- No animation changes
- No other pages touched
- All existing props (`autoPlay`, `playsInline`, `muted={false}`, `controls={false}`, `onEnded`) preserved

