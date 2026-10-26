import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentUser } from "@/lib/auth";

// Browse sections (teams, players, tournaments, engineering) share
// the sidebar so users can jump between sections from anywhere.
export default async function SectionsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1">
      <Sidebar userName={user?.name ?? null} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
