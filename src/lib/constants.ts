/**
 * Max nodes drawn on the topology map (D14).
 * Applied to the CURRENT VISIBLE SET, not the global list — so filtering to Rutul
 * shows Rutul's top 8, not whichever of his made the global top 8.
 * The remainder collapses into a single "+N more" aggregate node so the map
 * never lies about what's on the domain.
 *
 * This is a design decision, not content — it lives in code, not the database.
 */
export const MAP_CAP = 8;

/**
 * NOTE: there is deliberately no REVALIDATE_SECONDS constant here (there was in v0.5 —
 * it was a bug).
 *
 * Next.js requires `export const revalidate` to be a statically analysable literal in
 * the route file itself. `export const revalidate = REVALIDATE_SECONDS` does not
 * reliably work, and neither does `60 * 60`. It must be a bare number:
 *
 *     export const revalidate = 3600;
 *
 * So the ISR window is written as a literal in each page file. If you change it, change
 * it in BOTH `app/page.tsx` and `app/[handle]/page.tsx`.
 *
 * The timer is only a safety net regardless — the real mechanism is
 * revalidatePath('/', 'layout') fired from the admin route handlers (D8).
 */