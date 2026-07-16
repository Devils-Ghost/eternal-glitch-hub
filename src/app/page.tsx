import { getHubData } from "@/lib/data";
import { Hub } from "@/components/Hub";

// Must be a bare literal — Next requires this to be statically analysable.
// `export const revalidate = SOME_IMPORTED_CONST` does not reliably work.
// Safety net only; the real mechanism is revalidatePath('/', 'layout') on mutation (D8).
export const revalidate = 3600;

export default async function HomePage() {
  // Server component, so we can fetch directly. 2 owners + 5 projects = 8 reads,
  // and only on a cache rebuild — not per visitor.
  const { owners, projects } = await getHubData();

  return <Hub owners={owners} projects={projects} initialOwner={null} />;
}
