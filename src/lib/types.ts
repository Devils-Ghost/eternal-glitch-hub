// Single source of truth for data shapes. Everything else imports from here.

export type ProjectType = 'frontend' | 'backend' | 'fullstack';

/**
 * Deployment state, NOT a sentiment (D17).
 *   live     — deployed and reachable
 *   wip      — deployed but rough; sets expectations
 *   archived — not running, not being rescued (e.g. a free tier died)
 * How recently you worked on it is `lastActive`, which is independent of all three.
 */
export type ProjectStatus = 'live' | 'wip' | 'archived';

export interface Owner {
  id: string;
  displayName: string;
  /** Short slug → the URL path. `eternalglitch.com/dhaval` (D16) */
  handle: string;
  /** Hex. This owner's signature colour; drives the page accent when filtered (D11). */
  accent: string;
  /** Display order of the filter buttons. */
  order: number;
}

export interface Project {
  id: string;
  name: string;
  /** ≤180 chars. Enforced in the route handler, not just the form. */
  description: string;
  ownerId: string;
  type: ProjectType;
  /** Empty string = no action button, URL renders unlinked (D12). */
  url: string;
  /** Free string + <datalist> autocomplete from existing values. No enum, no collection. */
  host: string;
  stack: string[];
  status: ProjectStatus;
  /** Visibility switch — distinct from status. false = not public at all. */
  enabled: boolean;
  /**
   * Last commit pushed. Manually set — deliberately NOT updatedAt.
   * Fix a typo on a 2021 project tomorrow and updatedAt says 2026, lying to the visitor.
   * Stored as an ISO date string (not a Firestore Timestamp) so it crosses the
   * server→client component boundary without serialisation gymnastics.
   */
  lastActive: string;
  /** Board sort AND map priority (D14). Drag-reordered in M4 (D18). */
  order: number;
}

/** A project joined to its owner. What the UI actually renders. */
export interface ProjectWithOwner extends Project {
  owner: Owner;
}

/** Shape accepted when creating a project. Server sets id/timestamps. */
export type ProjectInput = Omit<Project, 'id'>;

/** Shape accepted when editing. Every field optional. */
export type ProjectPatch = Partial<ProjectInput>;

export const PROJECT_TYPES: ProjectType[] = ['frontend', 'backend', 'fullstack'];
export const PROJECT_STATUSES: ProjectStatus[] = ['live', 'wip', 'archived'];

export const DESCRIPTION_MAX = 180;

/** Frontend/fullstack rows get a Visit button; backend rows get Copy (D15). */
export function isVisitable(p: Pick<Project, 'type' | 'url'>): boolean {
  return p.url !== '' && (p.type === 'frontend' || p.type === 'fullstack');
}