"use client";

import { useState } from "react";
import type { ProjectStatus, ProjectWithOwner } from "@/lib/types";
import { isVisitable } from "@/lib/types";

/**
 * Status chips are deliberately LOW SATURATION — dark translucent fill, muted text.
 * Owner accents are solid and bright. That weight difference is what keeps two colour
 * systems from being mistaken for one: on this page, bright colour means owner, and a
 * chip is just a chip. Without it, an amber "work in progress" pill on Dhaval's cyan
 * row would read as "Rutul is somehow involved".
 *
 * Sentence case, not WIP — nobody outside the repo knows the abbreviation.
 */
const STATUS: Record<ProjectStatus, { label: string; fg: string; bg: string }> =
  {
    live: { label: "Live", fg: "#5DCAA5", bg: "rgba(93,202,165,0.12)" },
    wip: {
      label: "Work in progress",
      fg: "#EF9F27",
      bg: "rgba(239,159,39,0.12)",
    },
    archived: {
      label: "Archived",
      fg: "#7C839B",
      bg: "rgba(124,131,155,0.10)",
    },
  };

export function ProjectRow({
  project: p,
  index,
}: {
  project: ProjectWithOwner;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const status = STATUS[p.status];
  const year = new Date(p.lastActive).getFullYear();

  return (
    <li
      className="rise group relative border-b border-line last:border-b-0"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <span
        aria-hidden
        className="absolute top-0 bottom-0 left-0 w-[2px] transition-[width] duration-150 group-hover:w-[4px]"
        style={{ background: p.owner.accent }}
      />

      <div className="py-6 pr-1 pl-6 transition-colors duration-150 group-hover:bg-panel sm:pl-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 className="font-medium text-[1.0625rem] leading-snug tracking-tight">
              {p.name}
            </h3>
            <span
              className="rounded-full px-2.5 py-0.5 text-[0.6875rem] leading-normal font-medium whitespace-nowrap"
              style={{ background: status.bg, color: status.fg }}
            >
              {status.label}
            </span>
          </div>
          <span className="shrink-0 pt-1 font-mono text-eyebrow tracking-wider text-dim whitespace-nowrap uppercase">
            {year}
          </span>
        </div>

        <p className="mt-2.5 max-w-[62ch] text-[0.9375rem] leading-relaxed text-mute">
          {p.description}
        </p>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div
              className="font-mono text-eyebrow tracking-wider uppercase"
              style={{ color: p.owner.accent }}
            >
              {p.owner.displayName}
            </div>
            {/* Readable text, not a link. The button is the only action. */}
            <div className="mt-1 truncate font-mono text-xs text-mute">
              {p.url.replace(/^https?:\/\//, "") || "no deployment"}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="rounded-md border border-line px-3 py-1.5 font-mono text-eyebrow tracking-wider text-mute uppercase transition-colors duration-150 hover:border-edge hover:text-text"
            >
              Details
            </button>
            <ProjectAction project={p} />
          </div>
        </div>

        {/* 0fr → 1fr animates height without hardcoding a pixel value. */}
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-line pt-5 font-mono text-xs">
              <Meta label="Type" value={p.type} />
              <Meta label="Host" value={p.host || "—"} />
              <Meta label="Stack" value={p.stack.join(" · ") || "—"} />
            </dl>
          </div>
        </div>
      </div>
    </li>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="tracking-wider text-dim uppercase">{label}</dt>
      <dd className="text-mute">{value}</dd>
    </>
  );
}

function ProjectAction({ project: p }: { project: ProjectWithOwner }) {
  const [copied, setCopied] = useState(false);

  // No url = archived with a dead deployment. No button: the absence IS the signal.
  if (p.url === "") return null;

  // Filled with the owner's accent, dark text. This is the row's one loud element, and
  // it reinforces the page's single rule rather than introducing a new colour: Dhaval's
  // project gets Dhaval's button.
  const filled =
    "inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 font-mono text-eyebrow tracking-wider uppercase text-void transition-opacity duration-150 hover:opacity-85";

  if (isVisitable(p)) {
    // MUST be an anchor — cmd/middle-click has to open a new tab on a page whose whole
    // job is sending people elsewhere.
    return (
      <a
        href={p.url}
        target="_blank"
        rel="noopener noreferrer"
        className={filled}
        style={{ background: p.owner.accent }}
      >
        Visit
        <span aria-hidden>↗</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(p.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={filled}
      style={{ background: p.owner.accent }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
