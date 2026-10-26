import Link from "next/link";
import { Trophy } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ButtonLink } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";

export async function Navbar() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-4 z-40 px-4">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full border border-line/70 bg-surface/85 px-5 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-slate-950">
            <Trophy size={17} strokeWidth={2.4} />
          </span>
          <span className="hidden sm:inline">WC Recap.ai</span>
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
              <ButtonLink href="/create" size="sm">Create My Recap</ButtonLink>
            </>
          )}
        </div>
        <MobileNav loggedIn={!!user} />
      </div>
    </header>
  );
}
