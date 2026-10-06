import Link from "next/link";
import { Trophy } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-lg font-bold tracking-tight"
      >
        <Trophy className="size-6 text-accent" aria-hidden />
        WC Recap<span className="text-accent">.ai</span>
      </Link>
      {children}
    </main>
  );
}
