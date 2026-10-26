import Link from "next/link";
import { Trophy } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-line/60 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2 font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-slate-950">
                <Trophy size={16} />
              </span>
              AI World Cup Recap
            </div>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              Turn tournament data, unforgettable moments, and player performances
              into personalized AI-powered recap stories and videos.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Demo project — simulated & licensed-safe media only. No broadcast footage.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-16 gap-y-2 text-sm text-muted" aria-label="Footer">
            <Link href="/teams" className="hover:text-white">Teams</Link>
            <Link href="/create" className="hover:text-white">Create recap</Link>
            <Link href="/players" className="hover:text-white">Players</Link>
            <Link href="/recaps" className="hover:text-white">My recaps</Link>
            <Link href="/engineering" className="hover:text-white">Engineering</Link>
            <Link href="/login" className="hover:text-white">Sign in</Link>
          </nav>
        </div>
        <div className="mt-10 border-t border-line/50 pt-6 text-xs text-slate-500">
          Built with Next.js, TypeScript, PostgreSQL, OpenAI & FFmpeg.
        </div>
      </div>
    </footer>
  );
}
