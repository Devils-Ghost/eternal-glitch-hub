/**
 * Firebase CLIENT SDK — Auth only. Deliberately no Firestore (D5).
 *
 * If you ever find yourself adding `getFirestore` to this file, stop and re-read D5:
 * rules reject rather than filter, the admin panel needs disabled docs, and validating
 * "description <= 180 chars" in the rules DSL is miserable. Our rules are deny-all
 * (D6), so a client Firestore call would fail anyway — by design.
 *
 * The values below are public by design. NEXT_PUBLIC_* is compiled into the browser
 * bundle. That's fine: a Firebase web API key is an identifier, not a secret. It grants
 * nothing on its own — access is decided by security rules, which deny everything.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
};

// getApps() guard: Next hot-reloads modules in dev, and initializeApp twice throws.
const app = getApps().length ? getApp() : initializeApp(config);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * fetch() with the current user's Firebase ID token attached.
 * Every admin mutation goes through this — the token is what verifyAdmin() checks.
 */
export async function authedFetch(input: string, init: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  // getIdToken() refreshes automatically if the token is near expiry (1h lifetime).
  const token = await user.getIdToken();

  const res = await fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}