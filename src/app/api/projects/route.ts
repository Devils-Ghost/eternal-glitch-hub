import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

import { db, COLLECTIONS } from '@/lib/firebase-admin';
import { verifyAdmin, errorResponse } from '@/lib/auth';
import { getProjects, getOwners } from '@/lib/data';
import { validateProjectInput } from '@/lib/validate';

/**
 * GET /api/projects — admin only. Returns ALL projects including disabled ones.
 *
 * This is the D5 payoff in one line: the Admin SDK bypasses security rules, so reading
 * disabled docs costs nothing — no rule evaluation, no /admins lookup on every read.
 * Client-side Firestore would need `enabled == true || isAdmin()` in the rules, and
 * isAdmin() would cost a document read per rule evaluation.
 */
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);
    const [projects, owners] = await Promise.all([getProjects(true), getOwners()]);
    return Response.json({ projects, owners });
  } catch (e) {
    return errorResponse(e);
  }
}

/** POST /api/projects — create. */
export async function POST(req: Request) {
  try {
    await verifyAdmin(req);

    const owners = await getOwners();
    const input = validateProjectInput(await req.json(), owners.map((o) => o.id));

    const ref = await db.collection(COLLECTIONS.projects).add({
      ...input,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // ⚠️ 'layout' is load-bearing. revalidatePath('/') alone only purges the homepage —
    // /dhaval and /rutul are SEPARATE cache entries and would serve stale data for an
    // hour. The 'layout' argument purges the whole tree. (D8)
    revalidatePath('/', 'layout');

    return Response.json({ id: ref.id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}