"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Circle, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Stage {
  key: string;
  label: string;
  progress: number;
}

interface StatusResponse {
  recapStatus: string;
  videoUrl: string | null;
  error: string | null;
  job: {
    status: string;
    stage: string | null;
    stageLabel: string | null;
    progress: number;
    error: string | null;
  } | null;
  stages: readonly Stage[];
}

const POLL_MS = 1500;

/**
 * Polls the real job state and renders the generation checklist.
 * Progress shown is the actual GenerationJob.progress — never faked.
 */
export function StatusTracker({ recapId }: { recapId: string }) {
  const router = useRouter();
  const [data, setData] = useState<StatusResponse | null>(null);
  const [stalled, setStalled] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let lastProgress = -1;
    let unchangedTicks = 0;

    async function poll() {
      try {
        const res = await fetch(`/api/recaps/${recapId}/status`, {
          cache: "no-store",
        });
        const json = (await res.json()) as StatusResponse;
        setData(json);

        if (json.job?.progress === lastProgress) unchangedTicks++;
        else unchangedTicks = 0;
        lastProgress = json.job?.progress ?? -1;
        setStalled(unchangedTicks > 80); // ~2 min without movement

        if (
          !doneRef.current &&
          (json.recapStatus === "COMPLETED" || json.recapStatus === "FAILED")
        ) {
          doneRef.current = true;
          // Give the DB write a beat, then re-render the page server-side
          setTimeout(() => router.refresh(), 600);
          return;
        }
      } catch {
        /* transient poll failure — retry next tick */
      }
      timer = setTimeout(poll, POLL_MS);
    }
    void poll();
    return () => clearTimeout(timer);
  }, [recapId, router]);

  const stages = data?.stages ?? [];
  const currentStage = data?.job?.stage ?? null;
  const progress = data?.job?.progress ?? 0;
  const failed = data?.recapStatus === "FAILED" || data?.job?.status === "FAILED";

  return (
    <div className="rounded-xl border border-border bg-surface p-6 md:p-8">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {failed ? "Generation failed" : "Creating your World Cup story…"}
        </h2>
        <span className="text-sm font-semibold text-accent" aria-live="polite">
          {progress}%
        </span>
      </div>
      <Progress value={failed ? 100 : progress} className="mb-6" />

      <ol className="flex flex-col gap-3">
        {stages.map((s) => {
          const idx = stages.indexOf(s);
          const currentIdx = currentStage
            ? stages.findIndex((x) => x.key === currentStage)
            : -1;
          const done = failed ? idx < currentIdx : progress >= s.progress || idx < currentIdx;
          const active = !failed && s.key === currentStage;
          return (
            <li key={s.key} className="flex items-center gap-3 text-sm">
              {done ? (
                <Check className="size-4 shrink-0 text-accent-2" aria-hidden />
              ) : active ? (
                <Loader2
                  className="size-4 shrink-0 animate-spin text-accent"
                  aria-hidden
                />
              ) : (
                <Circle className="size-4 shrink-0 text-muted/40" aria-hidden />
              )}
              <span
                className={cn(
                  done
                    ? "text-foreground"
                    : active
                      ? "font-medium text-accent"
                      : "text-muted/60",
                )}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {failed && (
        <p role="alert" className="mt-5 flex items-center gap-2 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          {data?.error ?? "Something went wrong during generation. Please try again."}
        </p>
      )}
      {stalled && !failed && (
        <p className="mt-5 text-xs text-muted">
          This is taking longer than usual — large videos can take a few
          minutes. You can leave this page and come back.
        </p>
      )}
      <p className="mt-6 text-xs text-muted">
        AI narrative, generated visuals, FFmpeg video assembly — all running as a
        background job. This status is read live from the job table.
      </p>
    </div>
  );
}
