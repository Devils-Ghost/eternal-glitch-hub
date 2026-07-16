import { AdminConsole } from "@/components/admin/AdminConsole";

/**
 * Deliberately NOT server-rendered with data.
 *
 * This page holds no secrets — every byte of real data comes from /api/projects, which
 * verifyAdmin() gates. A non-admin loading this page sees an empty shell and a 403.
 * That's the correct security model: the gate is on the data, not the route. Hiding the
 * page from non-admins would be decoration.
 */
export const dynamic = "force-dynamic"; // never cache the admin console

export default function AdminPage() {
  return <AdminConsole />;
}
