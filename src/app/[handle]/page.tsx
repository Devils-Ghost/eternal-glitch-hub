import { notFound } from "next/navigation";
import { getHubData, getOwners } from "@/lib/data";
import { Hub } from "@/components/Hub";

export const revalidate = 3600;

/**
 * Pre-renders /dhaval and /rutul at build time.
 * A new owner added later isn't in this list, but `dynamicParams` defaults to true
 * so it renders on demand and then caches. No redeploy needed (D7).
 */
export async function generateStaticParams() {
  const owners = await getOwners();
  return owners.map((o) => ({ handle: o.handle }));
}

/**
 * ⚠️ Next 15: `params` is a Promise and must be awaited. This is a breaking change
 * from 14 — most tutorials you'll find online still show the old synchronous shape.
 */
export default async function OwnerPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const { owners, projects } = await getHubData();

  // Unknown handle → 404. Static routes (/admin) win over dynamic ones ([handle]),
  // so this only ever catches genuine strangers.
  if (!owners.some((o) => o.handle === handle)) notFound();

  // Same component as `/`, different starting filter — the whole point of D16.
  // No remount when the user toggles the filter, so the map won't re-animate (M4).
  return <Hub owners={owners} projects={projects} initialOwner={handle} />;
}
