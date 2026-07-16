import 'server-only';

import { adminAuth } from './firebase-admin';

/**
 * THE security gate (D5). Every mutation route handler calls this first.
 * There is exactly one of these on purpose — one place to reason about, one place
 * to get wrong. If you add a route that writes and forget to call this, the route
 * is public. Grep for `verifyAdmin` before shipping any new handler.
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

function adminUids(): string[] {
  return (process.env.ADMIN_UIDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Verifies the Firebase ID token and checks the UID against the ADMIN_UIDS allowlist.
 *
 * Why an env allowlist and not custom claims: the bootstrap problem (you'd need an
 * out-of-band way to set the first claim) plus up-to-1h revocation lag while the token
 * refreshes. At two admins, "paste a UID into Vercel and redeploy" wins. Migrate at 5+
 * or if membership churns.
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

  let uid: string;
  try {
    // Checks the signature, expiry, issuer, and audience. Not decorative.
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
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

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}