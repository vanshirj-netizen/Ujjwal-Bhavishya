

## Update Favicon

**Change**: Update `index.html` to use the new favicon URL and remove the old `favicon.ico` reference.

### Steps
1. In `index.html`, replace `<link rel="icon" href="/favicon.ico" />` with:
   - `<link rel="icon" type="image/png" href="https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media//UB-Favicon.png" />`
2. Add an Apple touch icon link for iOS home screen visibility:
   - `<link rel="apple-touch-icon" href="https://kuhqmnfsxlqcgnakbywe.supabase.co/storage/v1/object/public/media//UB-Favicon.png" />`
3. Delete `public/favicon.ico` to prevent browsers from auto-loading the old one.

**Files**: `index.html` (edit), `public/favicon.ico` (delete)

