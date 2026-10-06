import Link from "next/link";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <Trophy className="size-12 text-accent/40" aria-hidden />
      <h1 className="text-4xl font-extrabold tracking-tight">4–0–4</h1>
      <p className="max-w-sm text-muted">
        That page is offside — it doesn&apos;t exist or was moved.
      </p>
      <Button asChild>
        <Link href="/">Back to kick-off</Link>
      </Button>
    </main>
  );
}
