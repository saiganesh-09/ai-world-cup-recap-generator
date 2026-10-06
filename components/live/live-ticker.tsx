"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Flag } from "@/components/flag";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Goal,
  Target,
  Square,
  AlertTriangle,
  RefreshCw,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveState, LiveEvent } from "@/services/live/simulator";

const POLL_MS = 10_000;

const EVENT_ICON: Record<LiveEvent["type"], React.ReactNode> = {
  GOAL: <Goal className="size-4 text-accent" />,
  CHANCE: <Target className="size-4 text-sky-400" />,
  CARD: <Square className="size-3.5 fill-yellow-400 text-yellow-400" />,
  PENALTY: <AlertTriangle className="size-4 text-red-400" />,
  SUB: <RefreshCw className="size-4 text-muted" />,
  MOMENTUM: <Flame className="size-4 text-orange-400" />,
};

function LiveDot({ phase }: { phase: string }) {
  if (phase === "LIVE_1H" || phase === "LIVE_2H") {
    return (
      <span className="relative flex size-2.5" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
      </span>
    );
  }
  return null;
}

function PhaseBadge({ state }: { state: LiveState }) {
  const label =
    state.phase === "PRE"
      ? "UPCOMING"
      : state.phase === "HT"
        ? "HALF-TIME"
        : state.phase === "FT"
          ? "FULL-TIME"
          : state.displayMinute;
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wider",
        state.phase.startsWith("LIVE")
          ? "bg-red-500/15 text-red-400"
          : "bg-surface-2 text-muted",
      )}
    >
      <LiveDot phase={state.phase} />
      {label}
    </span>
  );
}

function StatBar({
  label,
  home,
  away,
  percent,
}: {
  label: string;
  home: number | string;
  away: number | string;
  percent?: number; // 0-100 home share
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">{home}</span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted">
          {label}
        </span>
        <span className="font-semibold">{away}</span>
      </div>
      {percent != null && (
        <div className="mt-1 flex h-1 overflow-hidden rounded-full bg-surface-2">
          <div className="bg-accent transition-all duration-700" style={{ width: `${percent}%` }} />
          <div className="bg-sky-500 transition-all duration-700" style={{ width: `${100 - percent}%` }} />
        </div>
      )}
    </div>
  );
}

/** Auto-updating live scorecard — polls /api/live every 10s. */
export function LiveTicker({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<LiveState | null>(null);
  const [flashGoal, setFlashGoal] = useState(false);
  const lastTopEvent = useRef<string | null>(null);

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as LiveState | null;
        if (stop || !data) return;
        const top = data.events[0];
        if (
          top?.type === "GOAL" &&
          lastTopEvent.current !== null &&
          lastTopEvent.current !== `${top.minute}-${top.text}`
        ) {
          setFlashGoal(true);
          setTimeout(() => setFlashGoal(false), 2500);
        }
        if (top) lastTopEvent.current = `${top.minute}-${top.text}`;
        setState(data);
      } catch {
        /* next poll retries */
      }
    }
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  if (!state) {
    return (
      <Card className={cn(compact && "bg-surface/60")}>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="skeleton h-2.5 w-2.5 rounded-full" />
          <div className="skeleton h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  const s = state.stats;
  const eventLimit = compact ? 3 : state.events.length;

  return (
    <Card className={cn("overflow-hidden", compact && "bg-surface/60")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            {!compact && "Live Match Centre"}
            {compact && "Live Scores"}
          </CardTitle>
          <PhaseBadge state={state} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Scoreboard */}
        <div
          className={cn(
            "grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-border bg-surface-2/50 px-4 py-3.5 transition-all",
            flashGoal && "ring-2 ring-accent/60 bg-accent/5",
          )}
        >
          <Link
            href={`/teams/${state.home.id}`}
            className="flex min-w-0 items-center gap-2.5 font-bold hover:text-accent"
          >
            <Flag code={state.home.shortName} name={state.home.name} className="text-2xl shrink-0" />
            <span className="truncate">{compact ? state.home.shortName : state.home.name}</span>
          </Link>
          <div className="flex items-center gap-2.5 text-2xl font-black tabular-nums">
            <span>{state.phase === "PRE" ? "–" : state.home.score}</span>
            <span className="text-muted">:</span>
            <span>{state.phase === "PRE" ? "–" : state.away.score}</span>
          </div>
          <Link
            href={`/teams/${state.away.id}`}
            className="flex min-w-0 items-center justify-end gap-2.5 font-bold hover:text-accent"
          >
            <span className="truncate">{compact ? state.away.shortName : state.away.name}</span>
            <Flag code={state.away.shortName} name={state.away.name} className="text-2xl shrink-0" />
          </Link>
        </div>

        {state.phase === "PRE" && (
          <p className="text-center text-sm text-muted">
            Kicks off soon — lineups confirmed
          </p>
        )}
        {state.phase === "FT" && state.next && (
          <p className="text-center text-sm text-muted">
            Next: <strong className="text-foreground">{state.next.home}</strong> vs{" "}
            <strong className="text-foreground">{state.next.away}</strong> in ~
            {state.next.startsInMin} min
          </p>
        )}

        {/* Stats */}
        {state.phase !== "PRE" && (
          <div className={cn("grid gap-3", compact ? "gap-2" : "sm:grid-cols-2 gap-x-8")}>
            <StatBar label="Possession" home={`${s.possessionHome}%`} away={`${100 - s.possessionHome}%`} percent={s.possessionHome} />
            <StatBar label="Shots (OT)" home={`${s.shots[0]} (${s.shotsOnTarget[0]})`} away={`${s.shots[1]} (${s.shotsOnTarget[1]})`} />
            <StatBar label="Corners" home={s.corners[0]} away={s.corners[1]} />
            <StatBar label="Fouls" home={s.fouls[0]} away={s.fouls[1]} />
          </div>
        )}

        {/* Event feed */}
        {state.events.length > 0 && (
          <ol className="flex flex-col">
            {state.events.slice(0, eventLimit).map((e, i) => (
              <li
                key={`${e.minute}-${i}`}
                className={cn(
                  "flex items-center gap-3 border-b border-border/60 py-2 text-sm last:border-0",
                  i === 0 && state.phase.startsWith("LIVE") && "text-foreground",
                )}
              >
                <span className="w-10 shrink-0 text-right font-mono text-xs font-bold text-accent">
                  {e.displayMinute}
                </span>
                <span aria-hidden className="w-5 shrink-0">{EVENT_ICON[e.type]}</span>
                <span className={cn("flex-1", e.type === "GOAL" && "font-semibold")}>
                  {e.text}
                </span>
                {e.scoreAfter && (
                  <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[11px] font-bold text-accent">
                    {e.scoreAfter}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}

        {!compact && state.events.length === 0 && state.phase !== "PRE" && (
          <p className="text-sm text-muted">No events yet — the match is just getting started.</p>
        )}
      </CardContent>
    </Card>
  );
}
