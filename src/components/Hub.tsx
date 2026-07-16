"use client";

import { useState } from "react";
import type { Owner, ProjectWithOwner } from "@/lib/types";
import { isVisitable } from "@/lib/types";

/**
 * M2: CORRECT AND BORING. There is deliberately zero styling here.
 *
 * The design pass is M4 — tokens, the topology map, search, accent retune, motion.
 * Building the design against real data is the whole reason M2 comes first; design
 * against dummy data and it flatters descriptions that are the wrong length and a
 * project count that's wrong.
 *
 * Client component because the owner filter is client state (D16). In M4 this gains
 * history.pushState so the URL tracks the filter — right now toggling the filter
 * changes the list but NOT the address bar. Known gap, not a bug.
 */

interface HubProps {
  owners: Owner[];
  projects: ProjectWithOwner[];
  initialOwner: string | null;
}

export function Hub({ owners, projects, initialOwner }: HubProps) {
  const [ownerHandle, setOwnerHandle] = useState<string | null>(initialOwner);

  // Archived is collapsed and out of the primary flow (D12). Zero archived at launch,
  // so this section won't render yet — it exists for the day a free tier dies.
  const active = projects.filter((p) => p.status !== "archived");
  const archived = projects.filter((p) => p.status === "archived");

  const visible = ownerHandle
    ? active.filter((p) => p.owner.handle === ownerHandle)
    : active;

  const visibleArchived = ownerHandle
    ? archived.filter((p) => p.owner.handle === ownerHandle)
    : archived;

  return (
    <main>
      <h1>eternalglitch.com</h1>
      <p>
        {visible.length} projects · {owners.length} operators
      </p>

      <nav aria-label="Filter by owner">
        <button
          onClick={() => setOwnerHandle(null)}
          aria-pressed={ownerHandle === null}
        >
          All
        </button>
        {owners.map((o) => (
          <button
            key={o.id}
            onClick={() => setOwnerHandle(o.handle)}
            aria-pressed={ownerHandle === o.handle}
          >
            {o.displayName}
          </button>
        ))}
      </nav>

      {visible.length === 0 ? (
        <p>Nothing here yet.</p>
      ) : (
        <ul>
          {visible.map((p) => (
            <ProjectRow key={p.id} project={p} />
          ))}
        </ul>
      )}

      {visibleArchived.length > 0 && (
        <details>
          <summary>+{visibleArchived.length} archived</summary>
          <ul>
            {visibleArchived.map((p) => (
              <ProjectRow key={p.id} project={p} />
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}

function ProjectRow({ project: p }: { project: ProjectWithOwner }) {
  return (
    <li>
      <h2>{p.name}</h2>
      <p>{p.description}</p>
      <p>
        {p.owner.displayName} · {p.type} · {p.host} · {p.status} · last active{" "}
        {new Date(p.lastActive).getFullYear()}
      </p>
      <p>{p.stack.join(" · ")}</p>
      <p>
        <code>{p.url.replace(/^https?:\/\//, "")}</code>{" "}
        <ProjectAction project={p} />
      </p>
    </li>
  );
}

/**
 * One action per row (D15). Frontend gets Visit, backend gets Copy.
 * No url (archived + dead deployment) → no button at all. The absence IS the signal.
 */
function ProjectAction({ project: p }: { project: ProjectWithOwner }) {
  const [copied, setCopied] = useState(false);

  if (p.url === "") return null;

  if (isVisitable(p)) {
    // MUST be an anchor, never <button onClick={() => location.href = ...}>.
    // cmd/middle-click has to open a new tab — this page's entire job is sending
    // people elsewhere. Also keeps it crawlable and keyboard-accessible for free.
    return (
      <a href={p.url} target="_blank" rel="noopener noreferrer">
        Visit ↗
      </a>
    );
  }

  // Backend: not navigation, so a real button is correct here.
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(p.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
