"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/primitives";
import { Flag } from "@/components/ui/flag";

// Featured-match widget that simulates a live broadcast: an elapsed
// clock ticks up, the score updates as goals "happen", stats grow
// toward full-time figures, and events drop into the feed in order.

interface LiveEvent {
  id: string;
  minute: number;
  extraMinute: number | null;
  type: string;
  description: string | null;
  player: string | null;
  teamId: string | null;
}

interface LiveStats {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
}

export interface LiveMatchData {
  homeShort: string;
  awayShort: string;
  homeCountry: string;
  awayCountry: string;
  homeTeamId: string;
  awayTeamId: string;
  finalHome: number;
  finalAway: number;
  stage: string;
  groupName: string | null;
  homeStats: LiveStats | null;
  awayStats: LiveStats | null;
  events: LiveEvent[];
}

const GOAL_TYPES = new Set(["GOAL", "PENALTY_GOAL", "OWN_GOAL"]);
// game-minutes per real second — a full match compresses to ~95s
const SPEED = 1;

export function LiveMatchCard({ match }: { match: LiveMatchData }) {
  const sorted = useMemo(
    () =>
      [...match.events].sort(
        (a, b) => a.minute + (a.extraMinute ?? 0) / 100 - (b.minute + (b.extraMinute ?? 0) / 100),
      ),
    [match.events],
  );

  const startAt = Math.max(0, (sorted[0]?.minute ?? 1) - 3);
  const [elapsed, setElapsed] = useState(startAt);

  useEffect(() => {
    const t = setInterval(() => {
      setElapsed((e) => Math.min(e + SPEED, 96));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const isFT = elapsed >= 96;
  const homeGoals = sorted.filter(
    (e) => GOAL_TYPES.has(e.type) && e.teamId === match.homeTeamId && e.minute <= elapsed,
  ).length;
  const awayGoals = sorted.filter(
    (e) => GOAL_TYPES.has(e.type) && e.teamId === match.awayTeamId && e.minute <= elapsed,
  ).length;
  const visible = sorted.filter((e) => e.minute <= elapsed).slice(-3).reverse();
  const scale = Math.min(1, elapsed / 90);
  const scaled = (s: LiveStats | null): LiveStats | null =>
    s
      ? {
          possession: s.possession,
          shots: Math.round(s.shots * scale),
          shotsOnTarget: Math.round(s.shotsOnTarget * scale),
          corners: Math.round(s.corners * scale),
          fouls: Math.round(s.fouls * scale),
        }
      : null;
  const hs = scaled(match.homeStats);
  const as = scaled(match.awayStats);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line/60 px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Live Scores
        </span>
        <span className="flex items-center gap-2 text-xs text-slate-500">
          {match.stage === "GROUP" ? `Group ${match.groupName ?? ""}` : match.stage.replace(/_/g, " ")}
          {isFT ? (
            <span className="rounded-full bg-slate-500/15 px-2 py-0.5 font-semibold text-slate-300">FT</span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 font-semibold text-red-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              LIVE {Math.min(elapsed, 90)}&rsquo;
            </span>
          )}
        </span>
      </div>
      <div className="px-5 py-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex items-center gap-3">
            <Flag country={match.homeCountry} className="h-6 w-9 rounded" />
            <span className="text-lg font-bold">{match.homeShort}</span>
          </div>
          <div className="rounded-xl bg-black/40 px-5 py-2 text-center font-mono text-3xl font-extrabold tabular-nums">
            {homeGoals} : {awayGoals}
          </div>
          <div className="flex items-center justify-end gap-3">
            <span className="text-lg font-bold">{match.awayShort}</span>
            <Flag country={match.awayCountry} className="h-6 w-9 rounded" />
          </div>
        </div>
        {hs && as && (
          <div className="mt-6 space-y-2.5 text-xs text-slate-400">
            <div className="flex justify-between font-mono">
              <span>{Math.round(hs.possession)}%</span>
              <span className="uppercase tracking-wider text-slate-500">Possession</span>
              <span>{Math.round(as.possession)}%</span>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="bg-gold transition-all duration-1000" style={{ width: `${hs.possession}%` }} />
              <div className="bg-sky-500 transition-all duration-1000" style={{ width: `${as.possession}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 text-center font-mono">
              <div>
                <span className="text-white">{hs.shots} ({hs.shotsOnTarget})</span>
                <span className="mx-2 text-slate-600">—</span>
                <span className="text-white">{as.shots} ({as.shotsOnTarget})</span>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">Shots (OT)</p>
              </div>
              <div>
                <span className="text-white">{hs.corners}</span>
                <span className="mx-2 text-slate-600">—</span>
                <span className="text-white">{as.corners}</span>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">Corners</p>
              </div>
              <div>
                <span className="text-white">{hs.fouls}</span>
                <span className="mx-2 text-slate-600">—</span>
                <span className="text-white">{as.fouls}</span>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">Fouls</p>
              </div>
            </div>
          </div>
        )}
        <div className="mt-5 min-h-[92px] space-y-2 border-t border-line/50 pt-4">
          {visible.length === 0 && (
            <p className="text-sm text-slate-500">Waiting for the first chance…</p>
          )}
          {visible.map((e, i) => (
            <div key={e.id} className={`flex items-center gap-3 text-sm ${i === 0 ? "animate-pulse-once" : "opacity-70"}`}>
              <span className="w-10 font-mono text-xs text-slate-500">
                {e.minute}{e.extraMinute ? `+${e.extraMinute}` : ""}&rsquo;
              </span>
              <span className={`h-2 w-2 rounded-full ${GOAL_TYPES.has(e.type) ? "bg-emerald-400" : "bg-yellow-400"}`} />
              <span className="text-slate-300">
                {e.description ?? `${e.player ?? ""} — ${e.type.replace(/_/g, " ").toLowerCase()}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
