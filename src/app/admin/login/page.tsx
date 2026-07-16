"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";

import { auth, googleProvider } from "@/lib/firebase-client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in? Skip straight through. /admin does the real gate anyway.
  useEffect(
    () => onAuthStateChanged(auth, (u) => u && router.replace("/admin")),
    [router],
  );

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      router.replace("/admin");
    } catch (e) {
      // auth/unauthorized-domain means the deployed domain isn't in
      // Firebase console → Authentication → Settings → Authorized domains.
      // localhost is whitelisted by default; your Vercel URL is not.
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Admin</h1>
      <button onClick={signIn} disabled={busy}>
        {busy ? "Signing in…" : "Sign in with Google"}
      </button>
      {error && <p role="alert">{error}</p>}
      <p>
        <small>
          Signing in does not make you an admin. Your UID must also be in
          ADMIN_UIDS — see SETUP.md step 7. First sign-in is expected to be
          rejected.
        </small>
      </p>
    </main>
  );
}
