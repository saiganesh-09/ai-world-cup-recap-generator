import Link from "next/link";
import { Trophy } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ButtonLink } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";

export async function Navbar() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-pitch/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold text-slate-950">
            <Trophy size={20} strokeWidth={2.4} />
          </span>
          <span className="hidden sm:inline">World Cup Recap</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex" aria-label="Main">
          <Link href="/teams" className="hover:text-white transition-colors">Teams</Link>
          <Link href="/players" className="hover:text-white transition-colors">Players</Link>
          <Link href="/engineering" className="hover:text-white transition-colors">Engineering</Link>
          {user && <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <ButtonLink href="/create" size="sm">Create My Recap</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">Sign in</ButtonLink>
              <ButtonLink href="/signup" size="sm">Get started</ButtonLink>
            </>
          )}
        </div>
        <MobileNav loggedIn={!!user} />
      </div>
    </header>
  );
}
