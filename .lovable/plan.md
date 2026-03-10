

# Fix: Google OAuth routes to /auth instead of /onboarding

## Root Cause
In `src/pages/Splash.tsx`, the `onAuthStateChange` listener only handles the `SIGNED_IN` event. After a Google OAuth redirect back to `/`, the auth state change may fire as `INITIAL_SESSION` instead. The 2.5s progress bar fallback then calls `getSession()` — if the session isn't ready yet, it sends the user to `/auth`.

## Fix — `src/pages/Splash.tsx` only

1. **Handle `INITIAL_SESSION` event** in the `onAuthStateChange` listener, not just `SIGNED_IN`. This catches the OAuth session that arrives when the page loads after redirect.

2. **Prevent race with progress bar fallback**: In the fallback `getSession()` check (line 105-125), add a brief delay and retry before concluding there's no session. This handles cases where the OAuth token exchange is still in-flight when the progress bar completes.

```tsx
// Line 81-82: Handle both events
supabase.auth.onAuthStateChange((event, session) => {
  if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session && !resolved.current) {
    resolved.current = true;
    routeBasedOnProfile(session.user.id);
  }
});
```

```tsx
// Line 108-124: Add retry before giving up
const route = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    if (resolved.current) return;
    resolved.current = true;
    await routeBasedOnProfile(session.user.id);
    return;
  }
  // Retry once after 1s for OAuth callbacks still processing
  await new Promise((r) => setTimeout(r, 1000));
  const { data: { session: retrySession } } = await supabase.auth.getSession();
  if (retrySession && !resolved.current) {
    resolved.current = true;
    await routeBasedOnProfile(retrySession.user.id);
    return;
  }
  if (!resolved.current) {
    doNavigate("/auth");
  }
};
```

No other files, animations, or logic changed.

