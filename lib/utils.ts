import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatScoreline(home: number, away: number): string {
  return `${home}–${away}`;
}

export const STAGE_LABELS: Record<string, string> = {
  GROUP: "Group Stage",
  ROUND_OF_16: "Round of 16",
  QUARTER_FINAL: "Quarter-final",
  SEMI_FINAL: "Semi-final",
  THIRD_PLACE: "Third place",
  FINAL: "Final",
};

export const POSITION_LABELS: Record<string, string> = {
  GK: "Goalkeeper",
  DF: "Defender",
  MF: "Midfielder",
  FW: "Forward",
};

export const RECAP_TYPE_LABELS: Record<string, string> = {
  TEAM_JOURNEY: "Team Journey",
  PLAYER_JOURNEY: "Player Journey",
  TOURNAMENT_HIGHLIGHTS: "Tournament Highlights",
  BEST_MATCHES: "Best Matches",
  EMOTIONAL_STORY: "Emotional Story",
  STATISTICAL_BREAKDOWN: "Statistical Breakdown",
};

export const TONE_LABELS: Record<string, string> = {
  EXCITING: "Exciting",
  EMOTIONAL: "Emotional",
  PROFESSIONAL: "Professional",
  STATISTICAL: "Statistical",
  COMMENTARY: "Commentary Style",
};

export const DURATION_LABELS: Record<string, string> = {
  SHORT: "Short (~60s)",
  STANDARD: "Standard (~2min)",
  EXTENDED: "Extended (~4-5min)",
};

export function stageOrder(stage: string): number {
  const order = [
    "GROUP",
    "ROUND_OF_16",
    "QUARTER_FINAL",
    "SEMI_FINAL",
    "THIRD_PLACE",
    "FINAL",
  ];
  return order.indexOf(stage);
}

/** Deterministic seeded RNG (mulberry32) for reproducible data generation. */
export function seededRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
