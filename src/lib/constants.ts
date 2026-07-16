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

/** ISR safety net. The real mechanism is revalidatePath('/', 'layout') on mutation (D8). */
export const REVALIDATE_SECONDS = 3600;