

# Root Cause: Google Sign-In Success Not Handled

## Problem
The Google sign-in button's `onClick` handler (line 311-318) only handles the **error** case. On success, `setSession` is called internally by the lovable module, but nothing in the Auth component reacts to it — no navigation happens. The session guard `useEffect` only runs on mount, so it doesn't catch the newly-established session.

## Fix — Auth.tsx (one edit)

**Lines 311-318**: After the `lovable.auth.signInWithOAuth` call succeeds, add navigation logic identical to the email/password login flow — check onboarding status and route accordingly:

```tsx
onClick={async () => {
  const { error } = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  if (error) {
    toast.error(error.message || "Google sign-in failed");
    return;
  }
  // On success, get session and route
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", session.user.id)
      .maybeSingle();
    toast.success("Welcome back! 🙏");
    navigate(profile?.onboarding_complete ? "/dashboard" : "/onboarding", { replace: true });
  }
}}
```

## Files Modified
1. `src/pages/Auth.tsx` — one edit (Google sign-in success handler)

