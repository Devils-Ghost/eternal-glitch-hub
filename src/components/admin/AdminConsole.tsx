"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";

import { auth, authedFetch } from "@/lib/firebase-client";
import type { Owner, Project } from "@/lib/types";
import { ProjectForm } from "./ProjectForm";

/**
 * M3: FUNCTIONAL, NOT PRETTY. Zero styling on purpose — design is M4.
 *
 * The drag-and-drop reorder (D18) is also M4. The `order` number input in ProjectForm
 * is a deliberate throwaway: M3's job is proving auth + CRUD + revalidation work, and
 * debugging @dnd-kit's sensors while also debugging 403s is how you end up unable to
 * tell which layer is broken.
 */
export function AdminConsole() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = still checking
  const [projects, setProjects] = useState<Project[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await authedFetch("/api/projects");
      setProjects(data.projects);
      setOwners(data.owners);
    } catch (e) {
      // A 403 here is the normal first-run experience: you're signed in but your UID
      // isn't in ADMIN_UIDS yet. See SETUP.md step 7.
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  // onAuthStateChanged IS the external subscription, so setState in its callback is the
  // sanctioned pattern — unlike setState in an effect BODY, which cascades renders.
  //
  // This was two effects (subscribe, then fetch-when-user-appears) and react-hooks was
  // right to flag it: load() calls setError(null) synchronously before its first await,
  // so the chain was setUser -> rerender -> effect -> load() -> rerender. Folding the
  // fetch into the auth callback does both in one pass and drops a render.
  //
  // `load` is useCallback([], stable), so listing it here doesn't re-subscribe.
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (u) void load();
        else router.replace("/admin/login");
      }),
    [router, load],
  );

  async function mutate(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const toggleEnabled = (p: Project) =>
    mutate(() =>
      authedFetch(`/api/projects/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !p.enabled }),
      }),
    );

  const remove = (p: Project) => {
    // Delete is permanent. `enabled: false` is the reversible option and is one click away.
    if (
      !confirm(
        `Delete "${p.name}" permanently? Disabling it instead is reversible.`,
      )
    )
      return;
    return mutate(() =>
      authedFetch(`/api/projects/${p.id}`, { method: "DELETE" }),
    );
  };

  const save = (values: Omit<Project, "id">) =>
    mutate(() =>
      editing === "new"
        ? authedFetch("/api/projects", {
            method: "POST",
            body: JSON.stringify(values),
          })
        : authedFetch(`/api/projects/${(editing as Project).id}`, {
            method: "PATCH",
            body: JSON.stringify(values),
          }),
    );

  const saveOwner = (
    id: string,
    patch: { displayName?: string; accent?: string },
  ) =>
    mutate(() =>
      authedFetch(`/api/owners/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    );

  if (user === undefined) return <p>Checking sign-in…</p>;
  if (user === null) return <p>Redirecting…</p>;

  // Distinct hosts already in use → <datalist> autocomplete. New hosts stay typeable,
  // autocomplete prevents typo-duplicates, and no extra collection exists to maintain.
  const knownHosts = [
    ...new Set(projects.map((p) => p.host).filter(Boolean)),
  ].sort();

  return (
    <main>
      <h1>Admin</h1>
      <p>
        {user.email} · <button onClick={() => signOut(auth)}>Sign out</button>
      </p>

      {error && (
        <p role="alert">
          <strong>{error}</strong>
        </p>
      )}

      <h2>Owners</h2>
      <ul>
        {owners.map((o) => (
          <OwnerRow key={o.id} owner={o} onSave={saveOwner} busy={busy} />
        ))}
      </ul>

      <h2>Projects ({projects.length})</h2>
      <button onClick={() => setEditing("new")} disabled={busy}>
        Add project
      </button>

      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Name</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Public</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td>{p.order}</td>
              <td>{p.name}</td>
              <td>
                {owners.find((o) => o.id === p.ownerId)?.displayName ??
                  "⚠️ orphaned"}
              </td>
              <td>{p.status}</td>
              <td>
                <button onClick={() => toggleEnabled(p)} disabled={busy}>
                  {p.enabled ? "Public" : "Hidden"}
                </button>
              </td>
              <td>
                <button onClick={() => setEditing(p)} disabled={busy}>
                  Edit
                </button>
                <button onClick={() => remove(p)} disabled={busy}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <ProjectForm
          project={editing === "new" ? null : editing}
          owners={owners}
          knownHosts={knownHosts}
          busy={busy}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}
    </main>
  );
}

function OwnerRow({
  owner,
  onSave,
  busy,
}: {
  owner: Owner;
  onSave: (
    id: string,
    patch: { displayName?: string; accent?: string },
  ) => void;
  busy: boolean;
}) {
  const [accent, setAccent] = useState(owner.accent);
  const dirty = accent !== owner.accent;

  return (
    <li>
      {owner.displayName} (/{owner.handle}){" "}
      <input
        type="color"
        value={accent}
        onChange={(e) => setAccent(e.target.value)}
      />
      <code>{accent}</code>
      {dirty && (
        <button onClick={() => onSave(owner.id, { accent })} disabled={busy}>
          Save colour
        </button>
      )}
    </li>
  );
}
