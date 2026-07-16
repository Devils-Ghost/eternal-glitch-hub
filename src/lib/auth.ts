import 'server-only';

import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * THE security gate (D5). Every mutation route handler calls this first.
 * There is exactly one of these on purpose — one place to reason about, one place
 * to get wrong. If you add a route that writes and forget to call this, the route
 * is public. Grep for `verifyAdmin` before shipping any new handler.
 *
 * ── Why this doesn't use firebase-admin/auth ──────────────────────────────────
 * firebase-admin/auth → jwks-rsa → jose. jose has been ESM-only since v6, but
 * jwks-rsa still pulls it in with a CommonJS require(). Node 22.12+/24 allows
 * require(esm) natively, so this works locally — but Vercel's Lambda runtime
 * patches Node's module loader (`/opt/rust/nodejs.js`, `Module._load`) and that
 * shim does NOT implement require(esm). Result: ERR_REQUIRE_ESM on Vercel only,
 * unfixable from our side.
 *
 * Ruled out along the way, don't retry these:
 *   - serverExternalPackages: no-op, firebase-admin is already a Next default external
 *   - Node 24 on Vercel: already set; the runtime shim is the blocker, not Node
 *   - next build --webpack: bundler was never the cause; error survived the switch
 *
 * So we verify the ID token ourselves. jose is the library at the bottom of that
 * whole chain anyway — we just import it as the ESM it actually is. This is ~40
 * lines and removes the entire problem class.
 *
 * firebase-admin stays for Firestore, which never touches jose.
 */

export class AuthError extends Error {
  constructor(
    message: string,
    public status: 401 | 403
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Google's public keys for Firebase ID tokens, in JWKS format.
 *
 * ⚠️ NOT the /metadata/x509/ URL that Firebase's docs mention — that endpoint serves
 * raw X.509 certs, which createRemoteJWKSet cannot parse. This is the JWKS one.
 *
 * Module-scope on purpose: createRemoteJWKSet caches the keys in memory and handles
 * refresh + rotation itself. Constructing it per-request would refetch every time.
 */
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function adminUids(): string[] {
  return (process.env.ADMIN_UIDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Verifies a Firebase ID token and checks the UID against the ADMIN_UIDS allowlist.
 *
 * jwtVerify checks the signature against Google's rotating public keys, plus exp,
 * iat, iss and aud. Per Firebase's spec, iss must be securetoken.google.com/<projectId>,
 * aud must be the project ID, and sub is the uid.
 *
 * @returns the verified admin's UID
 * @throws AuthError
 */
export async function verifyAdmin(req: Request): Promise<string> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new AuthError('Missing or malformed Authorization header', 401);
  }

  const token = header.slice('Bearer '.length);
  const projectId = requireEnv('FIREBASE_PROJECT_ID');

  let uid: string;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
    });

    // Firebase requires sub to be a non-empty string; it is the uid.
    if (typeof payload.sub !== 'string' || payload.sub === '') {
      throw new Error('Token has no subject');
    }

    // Firebase also requires auth_time to be in the past — jose doesn't know this
    // claim, so we check it ourselves.
    const authTime = payload.auth_time;
    if (typeof authTime === 'number' && authTime > Date.now() / 1000) {
      throw new Error('Token auth_time is in the future');
    }

    uid = payload.sub;
  } catch {
    throw new AuthError('Invalid or expired token', 401);
  }

  const allowed = adminUids();

  // Empty allowlist denies everyone rather than allowing everyone.
  // A misconfigured env var should lock us out, not open the doors.
  if (allowed.length === 0) {
    throw new AuthError('ADMIN_UIDS is not configured', 403);
  }

  if (!allowed.includes(uid)) {
    throw new AuthError('Not an admin', 403);
  }

  return uid;
}

/** Maps thrown errors to a JSON response. Never leaks internals to the client. */
export function errorResponse(e: unknown): Response {
  if (e instanceof AuthError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  const message = e instanceof Error ? e.message : 'Unknown error';
  // Validation errors are safe to surface; anything unexpected becomes a generic 500.
  const isValidation = e instanceof ValidationError;
  console.error('[api]', e);
  return Response.json(
    { error: isValidation ? message : 'Internal error' },
    { status: isValidation ? 400 : 500 }
  );
}