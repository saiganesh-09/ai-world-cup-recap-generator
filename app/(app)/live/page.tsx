import { LiveTicker } from "@/components/live/live-ticker";
import { Radio } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Live Scores" };

export default function LivePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
          <Radio className="size-6 text-red-500" aria-hidden />
          Live Scores
        </h1>
        <p className="mt-1 text-sm text-muted">
          Ball-by-ball simulated World Cup action — updates automatically every
          10 seconds. Every visitor watches the same match at the same minute.
        </p>
      </div>

      <LiveTicker />

      <p className="text-xs text-muted">
        Demo mode: matches are simulated deterministically from the seeded
        dataset — the schedule, scorers, and stats are identical for all
        viewers. With a live provider key this page streams real fixtures.
      </p>
    </div>
  );
}
