import 'server-only'; // build-time guard: importing this from a client component fails loudly

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * The Admin SDK bypasses Firestore security rules entirely (D5, D6).
 * That is exactly why our rules are deny-all and why this file must never
 * reach a browser. The `server-only` import above enforces that at build time.
 */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}. See .env.local.example`);
  return v;
}

function getAdminApp(): App {
  // Next.js hot-reloads modules in dev; initializeApp() twice throws.
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  return initializeApp({
    credential: cert({
      projectId: requireEnv('FIREBASE_PROJECT_ID'),
      clientEmail: requireEnv('FIREBASE_CLIENT_EMAIL'),
      // The private key arrives with literal backslash-n because .env files
      // cannot hold real newlines. This bites everyone exactly once.
      privateKey: requireEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
  });
}

export const db: Firestore = getFirestore(getAdminApp());

// NOTE: deliberately no `firebase-admin/auth` export here.
// Importing it drags in jwks-rsa -> jose, which breaks on Vercel's Lambda runtime.
// Token verification lives in lib/auth.ts using jose directly. See the comment there
// before you re-add it. This file is Firestore only.

export const COLLECTIONS = {
  projects: 'projects',
  owners: 'owners',
} as const;