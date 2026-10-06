"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ui] route error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <AlertTriangle className="size-12 text-danger/70" aria-hidden />
      <h1 className="text-3xl font-extrabold tracking-tight">Something went wrong</h1>
      <p className="max-w-sm text-muted">
        An unexpected error occurred. Please try again — if it persists, some
        tournament data may be temporarily unavailable.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
