import { revalidatePath } from 'next/cache';

import { db, COLLECTIONS } from '@/lib/firebase-admin';
import { verifyAdmin, errorResponse } from '@/lib/auth';
import { validateOwnerPatch } from '@/lib/validate';

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/owners/:id — displayName and accent only.
 *
 * This route IS the "each admin picks their own theme colour" feature (D11). Because
 * accent is data rather than CSS, the whole feature is one editable field. It would
 * have been a project if we'd hardcoded the colours — and it's also exactly why we
 * don't denormalise owner data into projects: a colour change here would otherwise
 * mean rewriting every one of that owner's project docs.
 *
 * Owners are seeded, not created here. Adding a third collaborator is a seed edit.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await verifyAdmin(req);
    const { id } = await params;

    const patch = validateOwnerPatch(await req.json());

    const ref = db.collection(COLLECTIONS.owners).doc(id);
    if (!(await ref.get()).exists) {
      return Response.json({ error: 'Owner not found' }, { status: 404 });
    }

    await ref.update(patch);

    revalidatePath('/', 'layout');
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}