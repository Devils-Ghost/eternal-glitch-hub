import 'server-only';

import { db, COLLECTIONS } from './firebase-admin';
import type { Owner, Project, ProjectWithOwner } from './types';

/**
 * Maps a Firestore doc to a plain serialisable object.
 *
 * This matters: Firestore Timestamp objects cannot cross the server→client
 * component boundary in Next.js — React can't serialise them. createdAt/updatedAt
 * are internal bookkeeping and are deliberately dropped here rather than converted.
 * `lastActive` is stored as an ISO string precisely to sidestep this.
 */
function toProject(doc: FirebaseFirestore.QueryDocumentSnapshot): Project {
  const d = doc.data();
  return {
    id: doc.id,
    name: d.name,
    description: d.description,
    ownerId: d.ownerId,
    type: d.type,
    url: d.url ?? '',
    host: d.host ?? '',
    stack: d.stack ?? [],
    status: d.status,
    enabled: d.enabled ?? false,
    lastActive: d.lastActive,
    order: d.order ?? 999,
  };
}

function toOwner(doc: FirebaseFirestore.QueryDocumentSnapshot): Owner {
  const d = doc.data();
  return {
    id: doc.id,
    displayName: d.displayName,
    handle: d.handle,
    accent: d.accent,
    order: d.order ?? 999,
  };
}

export async function getOwners(): Promise<Owner[]> {
  const snap = await db.collection(COLLECTIONS.owners).orderBy('order').get();
  return snap.docs.map(toOwner);
}

/**
 * @param includeDisabled admin-only. The Admin SDK reads disabled docs for free —
 *   no rule evaluation, no /admins lookup. That's the whole point of D5.
 *
 * Deliberately NOT `.where('enabled','==',true).orderBy('order')`. Firestore requires
 * a composite index the moment a query combines an equality filter with an orderBy on
 * a DIFFERENT field — a single-field orderBy alone needs no index. At 5-30 documents,
 * fetching everything and filtering in JS costs nothing and means one less piece of
 * infrastructure (an index definition) to create, deploy, and remember exists. This is
 * the same call as skipping denormalization: real projects, marginal cost.
 * Revisit only if this collection ever reaches the hundreds.
 */
export async function getProjects(includeDisabled = false): Promise<Project[]> {
  const snap = await db.collection(COLLECTIONS.projects).orderBy('order').get();
  const all = snap.docs.map(toProject);
  return includeDisabled ? all : all.filter((p) => p.enabled);  
}

/**
 * The join. Two owners + six projects = 8 document reads, matched by a loop in
 * server memory. This is why we don't denormalise owner data into projects:
 * copying accent onto every project would mean rewriting them all whenever an
 * owner changes their colour — which is an actual feature (D11).
 */
export async function getHubData(includeDisabled = false): Promise<{
  owners: Owner[];
  projects: ProjectWithOwner[];
}> {
  const [owners, projects] = await Promise.all([
    getOwners(),
    getProjects(includeDisabled),
  ]);

  const byId = new Map(owners.map((o) => [o.id, o]));

  const joined = projects
    .filter((p) => byId.has(p.ownerId)) // orphaned project = owner deleted; skip rather than crash
    .map((p) => ({ ...p, owner: byId.get(p.ownerId)! }));

  return { owners, projects: joined };
}

export async function getOwnerByHandle(handle: string): Promise<Owner | null> {
  const snap = await db
    .collection(COLLECTIONS.owners)
    .where('handle', '==', handle)
    .limit(1)
    .get();
  return snap.empty ? null : toOwner(snap.docs[0]);
}