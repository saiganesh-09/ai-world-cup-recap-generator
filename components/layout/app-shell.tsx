"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Library,
  Users,
  User,
  Trophy,
  Settings,
  Menu,
  X,
  LogOut,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/create", label: "Create Recap", icon: PlusCircle },
  { href: "/recaps", label: "My Recaps", icon: Library },
  { href: "/live", label: "Live Scores", icon: Radio },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/players", label: "Players", icon: User },
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="App navigation">
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent/15 text-accent"
                : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <item.icon className="size-4.5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-4 py-5 font-bold tracking-tight"
      >
        <Trophy className="size-5 text-accent" aria-hidden />
        WC Recap<span className="text-accent">.ai</span>
      </Link>
      <div className="flex-1 overflow-y-auto px-3">
        <NavLinks onNavigate={() => setOpen(false)} />
      </div>
      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="truncate text-sm font-medium">{userName}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-border bg-surface/80 backdrop-blur lg:block">
        {sidebar}
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <Trophy className="size-5 text-accent" aria-hidden />
          WC Recap<span className="text-accent">.ai</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X aria-hidden /> : <Menu aria-hidden />}
        </Button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border bg-surface">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 pt-16 lg:pl-60 lg:pt-0">
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
