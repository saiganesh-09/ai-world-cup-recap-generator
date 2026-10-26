"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clapperboard,
  Cpu,
  LayoutDashboard,
  LogOut,
  Settings,
  Trophy,
  User,
  Users,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/create", label: "Create Recap", icon: Clapperboard },
  { href: "/recaps", label: "My Recaps", icon: Video },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/players", label: "Players", icon: User },
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/engineering", label: "Engineering", icon: Cpu },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line/60 bg-surface/40 md:flex min-h-[calc(100vh-4rem)]">
      <nav className="flex-1 px-3 py-6 space-y-1" aria-label="Dashboard">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-gold/10 text-gold font-medium"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line/60 p-4">
        <p className="truncate px-2 pb-2 text-xs text-slate-500">Signed in as {userName}</p>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
