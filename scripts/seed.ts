/**
 * Seeds Firestore with the real owners and projects.
 *
 * Run:  npm run seed
 * Wipe: npm run seed -- --wipe    (deletes existing docs first)
 *
 * This script is your reset button. Because it exists, you can experiment
 * destructively against the real database without caring — which is why we're
 * not bothering with the Firestore emulator (it needs a Java runtime to solve
 * a quota problem we don't have).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
}
const db = getFirestore();

const OWNERS = [
  {
    id: 'dhaval',
    displayName: 'Dhaval Tanna',
    handle: 'dhaval',
    accent: '#4DD8E0',
    order: 1,
  },
  {
    id: 'rutul',
    displayName: 'Rutul Patel',
    handle: 'rutul',
    accent: '#E8A33D',
    order: 2,
  },
];

const PROJECTS = [
  {
    id: 'portfolio',
    name: 'Portfolio',
    description:
      'The long version: background, writing, and every project on this domain in proper detail.',
    ownerId: 'dhaval',
    type: 'frontend',
    url: 'https://dhaval-tanna.eternalglitch.com',
    host: 'vercel',
    stack: ['Next.js', 'TypeScript'],
    status: 'wip',
    enabled: true,
    lastActive: '2026-07-01',
    order: 1,
  },
  {
    id: 'collab-code-editor',
    name: 'Collab Code Editor',
    description:
      'Write code with someone else in the same browser tab, in real time.',
    ownerId: 'rutul',
    type: 'frontend',
    url: 'https://collab-code-editor.eternalglitch.com',
    host: 'cloudflare pages',
    stack: ['Next.js'],
    status: 'live',
    enabled: true,
    lastActive: '2026-07-01',
    order: 2,
  },
  {
    id: 'collab-editor-api',
    name: 'Collab Editor API',
    description:
      'The Node.js service behind the collab editor: sessions, sync, and shared document state.',
    ownerId: 'rutul',
    type: 'backend',
    url: 'https://collab-code-editor-api.eternalglitch.com',
    host: 'oracle',
    stack: ['Node.js'],
    status: 'live',
    enabled: true,
    lastActive: '2026-07-01',
    order: 3,
  },
  {
    id: 'smart-society',
    name: 'Smart Society',
    description:
      'Residential society management for an IoT disaster-alert system: member directory, contact requests, complaints, and a full admin tier.',
    ownerId: 'dhaval',
    type: 'frontend',
    url: 'https://smartsociety.eternalglitch.com',
    host: 'firebase',
    stack: ['React', 'Firebase RTDB', 'Firebase Auth'],
    status: 'live',
    // Moved Heroku → Firebase Hosting around 2023, but a migration isn't a commit.
    // This is exactly why lastActive is manual and separate from updatedAt.
    lastActive: '2021-01-01',
    enabled: true,
    order: 4,
  },
  {
    id: 'burger-builder',
    name: 'Burger Builder',
    description:
      'Stack a burger ingredient by ingredient, place an imaginary order, and watch it land in your order history. Full auth included.',
    ownerId: 'dhaval',
    type: 'frontend',
    url: 'https://burgerbuilder.eternalglitch.com',
    host: 'firebase',
    stack: ['React', 'Firebase RTDB', 'Firebase Auth'],
    status: 'live',
    lastActive: '2021-01-01',
    enabled: true,
    order: 5,
  },
];

async function wipe(collection: string) {
  const snap = await db.collection(collection).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`  wiped ${snap.size} docs from ${collection}`);
}

async function main() {
  const shouldWipe = process.argv.includes('--wipe');

  console.log(`Seeding project: ${process.env.FIREBASE_PROJECT_ID}`);

  if (shouldWipe) {
    console.log('Wiping...');
    await wipe('projects');
    await wipe('owners');
  }

  const batch = db.batch();

  for (const o of OWNERS) {
    const { id, ...data } = o;
    batch.set(db.collection('owners').doc(id), data, { merge: true });
  }

  for (const p of PROJECTS) {
    const { id, ...data } = p;
    batch.set(
      db.collection('projects').doc(id),
      { ...data, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  }

  await batch.commit();

  console.log(`  ${OWNERS.length} owners, ${PROJECTS.length} projects written.`);
  console.log('Done.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});