"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Owner, ProjectWithOwner } from "@/lib/types";
import { FilterBar } from "./FilterBar";
import { ProjectRow } from "./ProjectRow";

const NEUTRAL_ACCENT = "#7C839B";

function matches(p: ProjectWithOwner, q: string) {
  if (!q) return true;
  const hay = `${p.name} ${p.description} ${p.stack.join(" ")} ${p.host} ${p.owner.displayName}`;
  return hay.toLowerCase().includes(q.toLowerCase());
}

export function Hub({
  owners,
  projects,
  initialOwner,
}: {
  owners: Owner[];
  projects: ProjectWithOwner[];
  initialOwner: string | null;
}) {
  const [ownerHandle, setOwnerHandle] = useState<string | null>(initialOwner);
  const [query, setQuery] = useState("");

  /**
   * The filter is client state; the URL is kept in sync with history.pushState rather
   * than by navigating. Navigating to /dhaval as a separate page would remount the tree
   * and re-run the entry animation on every filter toggle. Typing /dhaval directly still
   * works — that's the server route handing us a different initialOwner (D16).
   */
  const selectOwner = useCallback((handle: string | null) => {
    setOwnerHandle(handle);
    window.history.pushState(null, "", handle ? `/${handle}` : "/");
  }, []);

  // Back button. Without this, browser history and the visible filter silently diverge.
  useEffect(() => {
    const onPop = () => {
      const seg = window.location.pathname.split("/")[1] ?? "";
      setOwnerHandle(seg === "" ? null : seg);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const activeOwner = owners.find((o) => o.handle === ownerHandle) ?? null;
  const accent = activeOwner?.accent ?? NEUTRAL_ACCENT;

  const { live, archived, total } = useMemo(() => {
    const byOwner = ownerHandle
      ? projects.filter((p) => p.owner.handle === ownerHandle)
      : projects;
    const found = byOwner.filter((p) => matches(p, query));
    return {
      live: found.filter((p) => p.status !== "archived"),
      archived: found.filter((p) => p.status === "archived"),
      total: projects.length,
    };
  }, [projects, ownerHandle, query]);

  return (
    <div
      // Every accent-aware thing downstream reads this one variable. Because it's a
      // registered @property, changing it here crossfades the whole page instead of
      // snapping — that's the retune.
      style={
        {
          "--accent": accent,
          transition: "--accent 220ms ease",
        } as React.CSSProperties
      }
      className="mx-auto min-h-dvh w-full max-w-3xl px-5 py-14 sm:px-8 sm:py-20"
    >
      <header className="rise">
        <h1 className="font-display text-[1.375rem] leading-none tracking-tight sm:text-[1.75rem]">
          eternalglitch
        </h1>
        <div
          aria-hidden
          className="mt-3 h-px w-16 transition-colors duration-200"
          style={{ background: "var(--accent)" }}
        />
        <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-mute">
          {total} things running on one domain, built by two people.
        </p>
      </header>

      <div className="rise mt-10" style={{ animationDelay: "60ms" }}>
        <FilterBar
          owners={owners}
          ownerHandle={ownerHandle}
          onOwner={selectOwner}
          query={query}
          onQuery={setQuery}
          count={projects.length}
        />
      </div>

      <main className="mt-8">
        {live.length === 0 && archived.length === 0 ? (
          <Empty query={query} owner={activeOwner} />
        ) : (
          <ul className="border-t border-line">
            {live.map((p, i) => (
              <ProjectRow key={p.id} project={p} index={i} />
            ))}
          </ul>
        )}

        {archived.length > 0 && <Archived projects={archived} />}
      </main>

      <footer className="mt-16 font-mono text-eyebrow tracking-wider text-dim uppercase">
        {owners.map((o) => o.displayName).join(" · ")}
      </footer>
    </div>
  );
}

/**
 * Archived stays visible but out of the primary flow (D12) — you keep the receipts
 * without leading with them. Renders nothing when empty, which is the case today.
 */
function Archived({ projects }: { projects: ProjectWithOwner[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="font-mono text-eyebrow tracking-wider text-dim uppercase transition-colors hover:text-mute"
      >
        {open ? "−" : "+"}
        {projects.length} archived
      </button>

      {open && (
        <ul className="mt-4 border-t border-line opacity-60">
          {projects.map((p, i) => (
            <ProjectRow key={p.id} project={p} index={i} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** An empty screen is an invitation to act, not a shrug. */
function Empty({ query, owner }: { query: string; owner: Owner | null }) {
  return (
    <p className="border-t border-line py-16 text-sm text-mute">
      {query
        ? `No projects match "${query}".`
        : owner
          ? `${owner.displayName} hasn't put anything here yet.`
          : "Nothing here yet."}
    </p>
  );
}
