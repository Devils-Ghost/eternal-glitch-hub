import 'server-only';

import { ValidationError } from './auth';
import {
  DESCRIPTION_MAX,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  type ProjectInput,
  type ProjectPatch,
} from './types';

/**
 * Validation lives here, in TypeScript, rather than in Firestore security rules.
 * That's the D5 payoff: "description <= 180 chars, type is one of three values,
 * ownerId must exist" is trivial here and miserable in the rules DSL.
 *
 * This runs on the server on every write. The form does its own checks for UX,
 * but those are a convenience — this is the one that counts. Never trust the client
 * even when the client is us.
 */

function str(v: unknown, field: string, { max, allowEmpty = false }: { max?: number; allowEmpty?: boolean } = {}): string {
  if (typeof v !== 'string') throw new ValidationError(`${field} must be a string`);
  const t = v.trim();
  if (!allowEmpty && t === '') throw new ValidationError(`${field} is required`);
  if (max && t.length > max) throw new ValidationError(`${field} must be ${max} characters or fewer (got ${t.length})`);
  return t;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], field: string): T {
  if (typeof v !== 'string' || !allowed.includes(v as T)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return v as T;
}

function num(v: unknown, field: string): number {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new ValidationError(`${field} must be a number`);
  return n;
}

function isoDate(v: unknown, field: string): string {
  const s = str(v, field);
  if (Number.isNaN(Date.parse(s))) throw new ValidationError(`${field} must be a valid date (YYYY-MM-DD)`);
  return s;
}

function urlOrEmpty(v: unknown): string {
  if (v === '' || v === undefined || v === null) return '';
  const s = str(v, 'url');
  try {
    new URL(s);
  } catch {
    throw new ValidationError('url must be a full URL including https://, or empty');
  }
  return s;
}

function stack(v: unknown): string[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) throw new ValidationError('stack must be an array of strings');
  return v.map((s, i) => str(s, `stack[${i}]`));
}

/**
 * @param validOwnerIds checked so a typo'd ownerId can't silently orphan a project.
 *   getHubData() skips orphans rather than crashing, which means a bad ownerId would
 *   make the project vanish from the page with no error anywhere. Catch it here.
 */
export function validateProjectInput(body: unknown, validOwnerIds: string[]): ProjectInput {
  if (typeof body !== 'object' || body === null) throw new ValidationError('Body must be an object');
  const b = body as Record<string, unknown>;

  const ownerId = str(b.ownerId, 'ownerId');
  if (!validOwnerIds.includes(ownerId)) {
    throw new ValidationError(`ownerId "${ownerId}" does not exist`);
  }

  return {
    name: str(b.name, 'name', { max: 80 }),
    description: str(b.description, 'description', { max: DESCRIPTION_MAX }),
    ownerId,
    type: oneOf(b.type, PROJECT_TYPES, 'type'),
    url: urlOrEmpty(b.url),
    host: str(b.host, 'host', { max: 40, allowEmpty: true }),
    stack: stack(b.stack),
    status: oneOf(b.status, PROJECT_STATUSES, 'status'),
    enabled: Boolean(b.enabled),
    lastActive: isoDate(b.lastActive, 'lastActive'),
    order: num(b.order, 'order'),
  };
}

/** Partial validation for PATCH. Only validates fields that are present. */
export function validateProjectPatch(body: unknown, validOwnerIds: string[]): ProjectPatch {
  if (typeof body !== 'object' || body === null) throw new ValidationError('Body must be an object');
  const b = body as Record<string, unknown>;
  const patch: ProjectPatch = {};

  if ('name' in b) patch.name = str(b.name, 'name', { max: 80 });
  if ('description' in b) patch.description = str(b.description, 'description', { max: DESCRIPTION_MAX });
  if ('ownerId' in b) {
    const ownerId = str(b.ownerId, 'ownerId');
    if (!validOwnerIds.includes(ownerId)) throw new ValidationError(`ownerId "${ownerId}" does not exist`);
    patch.ownerId = ownerId;
  }
  if ('type' in b) patch.type = oneOf(b.type, PROJECT_TYPES, 'type');
  if ('url' in b) patch.url = urlOrEmpty(b.url);
  if ('host' in b) patch.host = str(b.host, 'host', { max: 40, allowEmpty: true });
  if ('stack' in b) patch.stack = stack(b.stack);
  if ('status' in b) patch.status = oneOf(b.status, PROJECT_STATUSES, 'status');
  if ('enabled' in b) patch.enabled = Boolean(b.enabled);
  if ('lastActive' in b) patch.lastActive = isoDate(b.lastActive, 'lastActive');
  if ('order' in b) patch.order = num(b.order, 'order');

  if (Object.keys(patch).length === 0) throw new ValidationError('Empty patch');
  return patch;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Owners are seeded, not created via the UI. Only displayName and accent are editable. */
export function validateOwnerPatch(body: unknown): { displayName?: string; accent?: string } {
  if (typeof body !== 'object' || body === null) throw new ValidationError('Body must be an object');
  const b = body as Record<string, unknown>;
  const patch: { displayName?: string; accent?: string } = {};

  if ('displayName' in b) patch.displayName = str(b.displayName, 'displayName', { max: 60 });
  if ('accent' in b) {
    const accent = str(b.accent, 'accent');
    if (!HEX.test(accent)) throw new ValidationError('accent must be a 6-digit hex colour like #4DD8E0');
    patch.accent = accent;
  }

  if (Object.keys(patch).length === 0) throw new ValidationError('Empty patch');
  return patch;
}