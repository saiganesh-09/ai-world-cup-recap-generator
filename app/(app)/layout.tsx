import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentUser } from "@/lib/auth";

// Authenticated app shell — server-side gate, sidebar navigation.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <>
      <Navbar />
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <Sidebar userName={user.name} />
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </>
  );
}
