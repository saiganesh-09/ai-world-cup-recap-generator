"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

// Mobile hamburger menu — proper nav for small screens, not a
// shrunken desktop bar.
export function MobileNav({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="p-2 text-slate-300 hover:text-white"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      {open && (
        <nav
          className="absolute left-0 right-0 top-16 border-b border-line bg-surface px-4 py-4 flex flex-col gap-1 text-sm"
          aria-label="Mobile"
        >
          {[
            ["Teams", "/teams"],
            ["Players", "/players"],
            ["Engineering", "/engineering"],
            ...(loggedIn ? [["Dashboard", "/dashboard"], ["My Recaps", "/recaps"]] : []),
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-slate-300 hover:bg-white/5 hover:text-white"
            >
              {label}
            </Link>
          ))}
          <div className="mt-2 border-t border-line pt-3 flex gap-2">
            {loggedIn ? (
              <Link href="/create" onClick={() => setOpen(false)} className="flex-1 rounded-xl bg-gold px-4 py-2.5 text-center font-semibold text-slate-950">
                Create My Recap
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-line px-4 py-2.5 text-center text-slate-200">
                  Sign in
                </Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="flex-1 rounded-xl bg-gold px-4 py-2.5 text-center font-semibold text-slate-950">
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
