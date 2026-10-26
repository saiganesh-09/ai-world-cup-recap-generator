"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryGenerateButton({ recapId }: { recapId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/recaps/${recapId}/generate`, { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error?.message ?? "Could not restart generation.");
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={retry} disabled={loading}>
        <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        {loading ? "Restarting…" : "Retry generation"}
      </Button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
