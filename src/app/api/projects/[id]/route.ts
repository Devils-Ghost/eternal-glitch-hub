import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

import { db, COLLECTIONS } from '@/lib/firebase-admin';
import { verifyAdmin, errorResponse } from '@/lib/auth';
import { getOwners } from '@/lib/data';
import { validateProjectPatch } from '@/lib/validate';

// ⚠️ Next 15: params is a Promise and must be awaited. Route handlers too, not just pages.
type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/projects/:id — edit. Also handles the enable/disable toggle. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await verifyAdmin(req);
    const { id } = await params;

    const owners = await getOwners();
    const patch = validateProjectPatch(await req.json(), owners.map((o) => o.id));

    const ref = db.collection(COLLECTIONS.projects).doc(id);
    if (!(await ref.get()).exists) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });

    revalidatePath('/', 'layout');
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

/** DELETE /api/projects/:id — permanent. `enabled: false` is the reversible option. */
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    await verifyAdmin(req);
    const { id } = await params;

    await db.collection(COLLECTIONS.projects).doc(id).delete();

    revalidatePath('/', 'layout');
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}