"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Share2, Check, Wand2, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareButton({ shareId }: { shareId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        const url = `${window.location.origin}/share/${shareId}`;
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          window.prompt("Copy this link:", url);
        }
        void fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "recap_shared", props: { shareId } }),
        });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check aria-hidden /> : <Share2 aria-hidden />}
      {copied ? "Link copied" : "Share Recap"}
    </Button>
  );
}

export function GenerateButton({ recapId }: { recapId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await fetch(`/api/recaps/${recapId}/generate`, {
            method: "POST",
          });
          if (!res.ok) {
            const d = await res.json();
            setError(d.error ?? "Failed to start generation");
            setBusy(false);
            return;
          }
          router.refresh();
        }}
      >
        {busy ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : (
          <Wand2 aria-hidden />
        )}
        {busy ? "Starting…" : "Generate Recap"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function DeleteRecapButton({ recapId }: { recapId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="danger"
      size="sm"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm("Delete this recap permanently?")) return;
        setBusy(true);
        await fetch(`/api/recaps/${recapId}`, { method: "DELETE" });
        router.push("/recaps");
        router.refresh();
      }}
    >
      <Trash2 aria-hidden /> Delete
    </Button>
  );
}
