import type { TeamRef, PlayerTournamentStats } from "@/types";

/**
 * Deterministic live-match simulator.
 *
 * The entire match state is a pure function of wall-clock time — kickoff
 * schedule, every event minute, every stat — so every viewer sees the same
 * "live" match at the same minute with zero server state. Fixtures rotate
 * through the seeded teams on a repeating ~2h cycle.
 *
 * Deterministic per cycle: seeded PRNG generates the event timeline; clients
 * only see events whose minute has already elapsed (no spoilers).
 */

// ── Schedule ──────────────────────────────────────────────────────────
// Time-compressed ~2.4×: a full match plays in ~55 wall minutes, so events
// land every ~30s and the feed always feels alive (CREX-style ball-by-ball).
// Each slot: 4 min pre-match → 19 min 1H → 6 min HT → 21 min 2H → 5 min FT
const SLOT_MS = 55 * 60_000;
const PRE_MIN = 4;
const H1_WALL = 19; // wall minutes for first half
const HT_WALL = 6; // halftime
const H2_WALL = 21; // wall minutes for second half

export type LivePhase = "PRE" | "LIVE_1H" | "HT" | "LIVE_2H" | "FT";

export interface LiveTeam {
  id: string;
  name: string;
  shortName: string;
  score: number;
}

export interface LiveEvent {
  minute: number; // displayed match minute (1..93)
  displayMinute: string; // "67'" / "45+2'" / "90+3'"
  team: "home" | "away" | null;
  type: "GOAL" | "CHANCE" | "CARD" | "PENALTY" | "SUB" | "MOMENTUM";
  text: string;
  scoreAfter?: string; // "2–1" on goals
}

export interface LiveStats {
  possessionHome: number;
  shots: [number, number];
  shotsOnTarget: [number, number];
  corners: [number, number];
  fouls: [number, number];
}

export interface LiveState {
  phase: LivePhase;
  matchId: string;
  home: LiveTeam;
  away: LiveTeam;
  displayMinute: string | null;
  minute: number; // elapsed match minutes (0..93)
  events: LiveEvent[]; // most recent first, only elapsed
  stats: LiveStats;
  next: { home: string; away: string; startsInMin: number } | null;
}

// ── Seeded PRNG (mulberry32) — deterministic per cycle ────────────────
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];

// ── Fixture rotation: round-robin over teams, shuffled per cycle ──────
export function fixtureForCycle(cycle: number, teams: TeamRef[]) {
  const pairs: [number, number][] = [];
  for (let i = 0; i < teams.length; i++)
    for (let j = i + 1; j < teams.length; j++) pairs.push([i, j]);
  const [hi, ai] = pairs[cycle % pairs.length];
  // Alternate home/away deterministically so both orientations occur
  const flip = (Math.floor(cycle / pairs.length) + cycle) % 2 === 0;
  return flip ? ([teams[hi], teams[ai]] as const) : ([teams[ai], teams[hi]] as const);
}

// ── Event timeline for one cycle ──────────────────────────────────────
interface PlannedEvent {
  minute: number;
  team: "home" | "away" | null;
  type: LiveEvent["type"];
  scorer?: string;
  assist?: string;
}

const GOAL_TEMPLATES = [
  "GOAL! {scorer} finishes a sweeping move — {team} strike!",
  "GOAL! {scorer} buries it into the far corner!",
  "GOAL! {scorer} rises highest and powers the header in!",
  "GOAL! Clinical from {scorer} — {team} are in front!",
  "GOAL! {scorer} smashes home the rebound!",
];
const CHANCE_TEMPLATES = [
  "Huge chance! {scorer} drags it inches wide.",
  "{scorer} lets fly — the keeper tips it over the bar!",
  "So close! {scorer} rattles the crossbar!",
  "{scorer} goes through one-on-one — saved brilliantly!",
];
const PENALTY_TEMPLATES = ["PENALTY to {team}! Foul in the box…"];
const CARD_TEMPLATES = [
  "{scorer} is booked for a cynical challenge.",
  "Yellow card — {scorer} stops a dangerous counter.",
];
const SUB_TEMPLATES = ["Substitution for {team} — fresh legs on."];
const MOMENTUM_TEMPLATES = [
  "All {team} right now — relentless pressure.",
  "{team} are knocking on the door again…",
];

function planEvents(
  cycle: number,
  home: TeamRef,
  away: TeamRef,
  players: PlayerTournamentStats[],
): PlannedEvent[] {
  const r = rng(cycle * 2654435761);
  const events: PlannedEvent[] = [];

  // Weaker FIFA ranking number → higher goal expectancy
  const strength = (t: TeamRef) =>
    1.6 + ((40 - Math.min(t.fifaRanking ?? 40, 40)) / 40) * 1.4;

  const teamKey = (i: number) => (i === 0 ? "home" : "away");
  const teams = [home, away];
  const squads = [
    players.filter((p) => p.teamId === home.id).map((p) => p.player),
    players.filter((p) => p.teamId === away.id).map((p) => p.player),
  ].map((s) => (s.length ? s : [{ name: "Unknown Player" }]));

  // Goals: Poisson-ish count per team
  for (const i of [0, 1] as const) {
    const lam = strength(teams[i]);
    let goals = 0;
    const x = r();
    if (x < lam * 0.32) goals = 1;
    if (x < lam * 0.22) goals = 2;
    if (x < lam * 0.1) goals = 3;
    if (x < lam * 0.03) goals = 4;
    for (let g = 0; g < goals; g++) {
      const lateBias = r() < 0.35;
      const minute = lateBias
        ? 70 + Math.floor(r() * 22)
        : 5 + Math.floor(r() * 70);
      const squad = squads[i];
      const scorer = pick(r, squad).name;
      const penalty = r() < 0.12;
      if (penalty) {
        events.push({
          minute: Math.max(1, minute - 1),
          team: teamKey(i),
          type: "PENALTY",
        });
      }
      events.push({
        minute,
        team: teamKey(i),
        type: "GOAL",
        scorer,
        assist: r() < 0.6 ? pick(r, squad).name : undefined,
      });
    }
  }

  // Supporting drama: chances, cards, subs, momentum swings — dense enough
  // that something lands in the feed roughly every match minute or two.
  const extras = 14 + Math.floor(r() * 8);
  for (let i = 0; i < extras; i++) {
    const teamIdx = r() < 0.5 ? 0 : 1;
    const minute = 3 + Math.floor(r() * 88);
    const roll = r();
    const type =
      roll < 0.4 ? "CHANCE" : roll < 0.65 ? "CARD" : roll < 0.8 ? "MOMENTUM" : "SUB";
    events.push({
      minute,
      team: teamKey(teamIdx),
      type,
      scorer: pick(r, squads[teamIdx]).name,
    });
  }

  return events
    .map((e) => ({ ...e, minute: Math.min(93, Math.max(1, e.minute)) }))
    .sort((a, b) => a.minute - b.minute);
}

function renderEventText(e: PlannedEvent, home: TeamRef, away: TeamRef, r: () => number): string {
  const teamName = e.team === "home" ? home.name : away.name;
  const t = { scorer: e.scorer ?? "", team: teamName };
  const fill = (tpl: string) =>
    tpl.replace("{scorer}", t.scorer).replace("{team}", t.team);
  switch (e.type) {
    case "GOAL":
      return fill(pick(r, GOAL_TEMPLATES)) + (e.assist ? ` (assist: ${e.assist})` : "");
    case "PENALTY":
      return fill(pick(r, PENALTY_TEMPLATES));
    case "CHANCE":
      return fill(pick(r, CHANCE_TEMPLATES));
    case "CARD":
      return fill(pick(r, CARD_TEMPLATES));
    case "SUB":
      return fill(pick(r, SUB_TEMPLATES));
    case "MOMENTUM":
      return fill(pick(r, MOMENTUM_TEMPLATES));
  }
}

// ── Public API ─────────────────────────────────────────────────────────

/** Full live state at an instant — pure, deterministic, cacheable per ~10s. */
export function getLiveState(
  now: number,
  teams: TeamRef[],
  players: PlayerTournamentStats[],
): LiveState | null {
  if (teams.length < 2) return null;

  const cycle = Math.floor(now / SLOT_MS);
  const [home, away] = fixtureForCycle(cycle, teams);
  const planned = planEvents(cycle, home, away, players);
  const rt = rng(cycle * 2246822519 + 7); // render rng — stable per event
  const t = now - cycle * SLOT_MS;

  const msFrom = (startMin: number) => t - startMin * 60_000;
  const H1_END = PRE_MIN + H1_WALL;
  const HT_END = H1_END + HT_WALL;
  const H2_END = HT_END + H2_WALL;
  const phase: LivePhase =
    t < PRE_MIN * 60_000
      ? "PRE"
      : t < H1_END * 60_000
        ? "LIVE_1H"
        : t < HT_END * 60_000
          ? "HT"
          : t < H2_END * 60_000
            ? "LIVE_2H"
            : "FT";

  // Match minute: 1H runs 0→45+2 (wall 19), 2H runs 46→90+3 (wall 21)
  const minute =
    phase === "PRE"
      ? 0
      : phase === "LIVE_1H"
        ? Math.min(47, Math.floor((msFrom(PRE_MIN) / 60_000 / H1_WALL) * 47))
        : phase === "HT"
          ? 47
          : phase === "LIVE_2H"
            ? Math.min(93, 46 + Math.floor((msFrom(HT_END) / 60_000 / H2_WALL) * 47))
            : 93;

  const displayMinute =
    phase === "PRE"
      ? null
      : phase === "HT"
        ? "HT"
        : phase === "FT"
          ? "FT"
          : phase === "LIVE_1H"
            ? minute <= 45
              ? `${minute}'`
              : `45+${minute - 45}'`
            : minute <= 90
              ? `${minute}'`
              : `90+${minute - 90}'`;

  // Reveal only elapsed events; newest first
  const events = planned
    .filter((e) => e.minute <= minute)
    .map((e) => {
      const hs = planned.filter((p) => p.type === "GOAL" && p.team === "home" && p.minute <= e.minute).length;
      const as = planned.filter((p) => p.type === "GOAL" && p.team === "away" && p.minute <= e.minute).length;
      return {
        minute: e.minute,
        displayMinute: e.minute <= 45 ? `${e.minute}'` : e.minute <= 47 ? `45+${e.minute - 45}'` : e.minute <= 90 ? `${e.minute}'` : `90+${e.minute - 90}'`,
        team: e.team,
        type: e.type,
        text: renderEventText(e, home, away, rt),
        scoreAfter: e.type === "GOAL" ? `${hs}–${as}` : undefined,
      } satisfies LiveEvent;
    })
    .reverse();

  const homeScore = planned.filter((p) => p.type === "GOAL" && p.team === "home" && p.minute <= minute).length;
  const awayScore = planned.filter((p) => p.type === "GOAL" && p.team === "away" && p.minute <= minute).length;

  // Stats accumulate deterministically with the clock
  const sr = rng(cycle * 1597334677);
  const possBase = 46 + Math.floor(sr() * 10); // 46–55
  const stat = (rate: number, noise: number) =>
    Math.floor((minute / 93) * rate + sr() * noise);
  const stats: LiveStats = {
    possessionHome: possBase,
    shots: [stat(14, 3), stat(11, 3)],
    shotsOnTarget: [stat(6, 1.5), stat(5, 1.5)],
    corners: [stat(7, 2), stat(5, 2)],
    fouls: [stat(11, 3), stat(10, 3)],
  };

  const [nHome, nAway] = fixtureForCycle(cycle + 1, teams);
  const next =
    phase === "FT"
      ? {
          home: nHome.name,
          away: nAway.name,
          startsInMin: Math.ceil(((cycle + 1) * SLOT_MS + PRE_MIN * 60_000 - now) / 60_000),
        }
      : null;

  return {
    phase,
    matchId: `live-${cycle}`,
    home: { id: home.id, name: home.name, shortName: home.shortName, score: homeScore },
    away: { id: away.id, name: away.name, shortName: away.shortName, score: awayScore },
    displayMinute,
    minute,
    events,
    stats,
    next,
  };
}
