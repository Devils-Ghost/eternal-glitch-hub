"use client";

import { useState } from "react";
import {
  DESCRIPTION_MAX,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  type Owner,
  type Project,
} from "@/lib/types";

/**
 * Create/edit form. Unstyled — M4.
 *
 * The checks here are for UX only. The real validation is server-side in
 * lib/validate.ts, which runs on every write regardless of what the client sends.
 * Never trust the client, even when the client is us.
 */

const BLANK: Omit<Project, "id"> = {
  name: "",
  description: "",
  ownerId: "",
  type: "frontend",
  url: "",
  host: "",
  stack: [],
  status: "live",
  enabled: true,
  lastActive: new Date().toISOString().slice(0, 10),
  order: 99,
};

export function ProjectForm({
  project,
  owners,
  knownHosts,
  busy,
  onSave,
  onCancel,
}: {
  project: Project | null;
  owners: Owner[];
  knownHosts: string[];
  busy: boolean;
  onSave: (values: Omit<Project, "id">) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<Omit<Project, "id">>(() => {
    if (!project) return { ...BLANK, ownerId: owners[0]?.id ?? "" };
    const { id: _id, ...rest } = project;
    return rest;
  });

  const set = <K extends keyof Omit<Project, "id">>(
    k: K,
    val: Omit<Project, "id">[K],
  ) => setV((prev) => ({ ...prev, [k]: val }));

  const overLimit = v.description.length > DESCRIPTION_MAX;

  return (
    <section>
      <h3>{project ? `Edit: ${project.name}` : "New project"}</h3>

      <div>
        <label>
          Name
          <input value={v.name} onChange={(e) => set("name", e.target.value)} />
        </label>
      </div>

      <div>
        <label>
          Description
          <textarea
            value={v.description}
            rows={3}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
        <small style={overLimit ? { color: "red" } : undefined}>
          {v.description.length}/{DESCRIPTION_MAX}
        </small>
      </div>

      <div>
        <label>
          Owner
          <select
            value={v.ownerId}
            onChange={(e) => set("ownerId", e.target.value)}
          >
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.displayName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <label>
          Type
          <select
            value={v.type}
            onChange={(e) => set("type", e.target.value as Project["type"])}
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <small>frontend/fullstack get a Visit button; backend gets Copy.</small>
      </div>

      <div>
        <label>
          URL
          <input
            value={v.url}
            placeholder="https://thing.eternalglitch.com"
            onChange={(e) => set("url", e.target.value)}
          />
        </label>
        <small>
          Leave empty if the deployment is dead — the row then renders with no
          button at all, which is the signal. Better than a link that 500s.
        </small>
      </div>

      <div>
        <label>
          Host
          <input
            value={v.host}
            list="known-hosts"
            onChange={(e) => set("host", e.target.value)}
          />
        </label>
        {/* Autocompletes from hosts already in use, but any new value is typeable. */}
        <datalist id="known-hosts">
          {knownHosts.map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>
      </div>

      <div>
        <label>
          Stack (comma-separated)
          <input
            value={v.stack.join(", ")}
            onChange={(e) =>
              set(
                "stack",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </label>
      </div>

      <div>
        <label>
          Status
          <select
            value={v.status}
            onChange={(e) => set("status", e.target.value as Project["status"])}
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <small>
          Deployment state, not a mood. live = up. wip = up but rough. archived
          = not running, not being rescued.
        </small>
      </div>

      <div>
        <label>
          Last active
          <input
            type="date"
            value={v.lastActive}
            onChange={(e) => set("lastActive", e.target.value)}
          />
        </label>
        <small>Last commit pushed. Not when you last edited this form.</small>
      </div>

      <div>
        <label>
          Order
          <input
            type="number"
            value={v.order}
            onChange={(e) => set("order", Number(e.target.value))}
          />
        </label>
        <small>
          Lower = higher on the board. Top 8 also appear on the map.
          Drag-to-reorder replaces this in M4.
        </small>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={v.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
          />
          Public
        </label>
        <small>
          Unchecked = hidden from the site entirely. Separate from status.
        </small>
      </div>

      {/* No <form> element: submit-on-enter would fire mid-typing in a single-input row. */}
      <button
        onClick={() => onSave(v)}
        disabled={busy || overLimit || !v.name.trim()}
      >
        {busy ? "Saving…" : project ? "Save changes" : "Publish project"}
      </button>
      <button onClick={onCancel} disabled={busy}>
        Cancel
      </button>
    </section>
  );
}
