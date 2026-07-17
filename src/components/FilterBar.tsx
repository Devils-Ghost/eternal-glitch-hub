"use client";

import { useEffect, useRef } from "react";
import type { Owner } from "@/lib/types";

/**
 * The owner filter exists *because* the domain is shared — it's the one control that
 * only makes sense for this site. So it gets to be the memorable interaction: picking
 * an owner retunes the page's accent rather than just hiding rows.
 */
export function FilterBar({
  owners,
  ownerHandle,
  onOwner,
  query,
  onQuery,
  count,
}: {
  owners: Owner[];
  ownerHandle: string | null;
  onOwner: (handle: string | null) => void;
  query: string;
  onQuery: (q: string) => void;
  count: number;
}) {
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" to focus search. Free, and the muscle memory is universal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        onQuery("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onQuery]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-[16rem]">
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search projects"
          className="w-full rounded-[3px] border border-line bg-transparent px-3 py-2 pr-8 font-mono text-xs text-text placeholder:text-dim focus:border-[var(--accent)] focus:outline-none"
        />
        {query === "" && (
          <kbd
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-eyebrow text-dim"
          >
            /
          </kbd>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Pill active={ownerHandle === null} onClick={() => onOwner(null)}>
          All {count}
        </Pill>
        {owners.map((o) => (
          <Pill
            key={o.id}
            active={ownerHandle === o.handle}
            accent={o.accent}
            onClick={() => onOwner(o.handle)}
          >
            {o.displayName.split(" ")[0]}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function Pill({
  active,
  accent,
  onClick,
  children,
}: {
  active: boolean;
  accent?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="rounded-[3px] border px-3 py-2 font-mono text-eyebrow tracking-wider uppercase transition-colors duration-200"
      style={{
        borderColor: active
          ? (accent ?? "var(--color-edge)")
          : "var(--color-line)",
        color: active ? (accent ?? "var(--color-text)") : "var(--color-dim)",
      }}
    >
      {children}
    </button>
  );
}
