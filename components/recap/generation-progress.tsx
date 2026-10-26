"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleDashed, Loader2 } from "lucide-react";
import { ProgressBar } from "@/components/ui/primitives";
import { STAGE_LABELS } from "@/types/domain";

// Polls /api/recaps/:id/status and renders the *real* pipeline
// stage — progress only advances when the backend reports it.

const STAGE_ORDER = [
  "COLLECTING_DATA",
  "ANALYZING_PERFORMANCES",
  "FINDING_MOMENTS",
  "WRITING_STORY",
  "PREPARING_VISUALS",
  "RENDERING_VIDEO",
  "FINALIZING",
] as const;

interface Status {
  status: string;
  videoUrl: string | null;
  job: { status: string; stage: string; progress: number; error: string | null } | null;
}

export function GenerationProgress({ recapId, teamName }: { recapId: string; teamName: string }) {
  const router = useRouter();
  const [data, setData] = useState<Status | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(`/api/recaps/${recapId}/status`);
        const j = await res.json();
        if (!res.ok) return;
        const s = j.data as Status;
        setData(s);
        if (s.status === "READY") {
          if (timer.current) clearInterval(timer.current);
          router.refresh(); // reload server component with video
        }
        if (s.status === "FAILED") {
          if (timer.current) clearInterval(timer.current);
          setFailed(s.job?.error ?? "Generation failed. Please try again.");
        }
      } catch {
        // transient network error — keep polling
      }
    }
    poll();
    timer.current = setInterval(poll, 2000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [recapId, router]);

  const currentStage = data?.job?.stage ?? "QUEUED";
  const progress = data?.job?.progress ?? 0;
  const currentIdx = STAGE_ORDER.indexOf(currentStage as (typeof STAGE_ORDER)[number]);

  if (failed) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          ✕
        </div>
        <h2 className="text-xl font-bold">Generation didn&rsquo;t complete</h2>
        <p className="mt-2 text-sm text-muted">{failed}</p>
        <p className="mt-4 text-xs text-slate-500">You can retry from your recaps page.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-16">
      <h1 className="text-center text-2xl font-bold">
        Creating {teamName ? `${teamName}’s` : "your"} World Cup story…
      </h1>
      <p className="mt-2 text-center text-sm text-muted">
        This usually takes under a minute.
      </p>
      <div className="mt-8">
        <ProgressBar value={progress} />
        <p className="mt-2 text-right text-xs text-slate-500">{progress}%</p>
      </div>
      <ol className="mt-8 space-y-3" aria-label="Generation stages">
        {STAGE_ORDER.map((stage, i) => {
          const done = currentIdx > i || data?.status === "READY";
          const active = currentIdx === i && data?.status !== "READY";
          return (
            <li key={stage} className="flex items-center gap-3 text-sm">
              {done ? (
                <Check size={18} className="text-emerald-400" aria-label="done" />
              ) : active ? (
                <Loader2 size={18} className="animate-spin text-sky-400" aria-label="in progress" />
              ) : (
                <CircleDashed size={18} className="text-slate-600" aria-label="pending" />
              )}
              <span className={done ? "text-slate-400" : active ? "text-white" : "text-slate-600"}>
                {STAGE_LABELS[stage]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
