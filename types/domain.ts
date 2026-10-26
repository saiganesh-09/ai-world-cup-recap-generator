import type {
  MatchStage,
  Position,
  RecapLength,
  RecapTone,
  RecapType,
} from "@prisma/client";

// ── Normalized data passed through the recap pipeline ───────
// Everything the AI/moment engines need, in provider-agnostic shape.

export interface NormalizedMoment {
  matchId: string;
  playerId: string | null;
  playerName: string | null;
  teamRef: string;
  minute: number;
  title: string;
  description: string;
  importanceScore: number; // 0-100
  order?: number;
}

export interface NormalizedMatch {
  id: string;
  date: string;
  venue: string | null;
  stage: MatchStage;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homePenScore: number | null;
  awayPenScore: number | null;
  result: "W" | "D" | "L" | null; // from perspective of focusTeam, if set
  events: {
    minute: number;
    extraMinute: number | null;
    type: string;
    playerName: string | null;
    teamName: string;
    detail: string | null;
    description: string | null;
  }[];
}

export interface NormalizedPlayerStat {
  playerId: string;
  name: string;
  position: Position;
  jerseyNumber: number;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  shots: number;
  tackles: number;
  avgRating: number;
}

export interface NormalizedTeamStat {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  avgPossession: number;
  totalShots: number;
  cleanSheets: number;
  furthestStage: MatchStage | null;
  /** did the team lift the trophy */
  champion: boolean;
}

// The single context object handed to the AI engine.
export interface RecapContext {
  tournament: {
    id: string;
    name: string;
    year: number;
    country: string;
    isDemo: boolean;
  };
  focusTeam: {
    id: string;
    name: string;
    shortName: string;
    flagEmoji: string | null;
    primaryColor: string;
    stats: NormalizedTeamStat;
  } | null;
  focusPlayer: {
    id: string;
    name: string;
    position: Position;
    teamName: string;
    stats: Omit<NormalizedPlayerStat, "playerId" | "name" | "position" | "jerseyNumber">;
  } | null;
  matches: NormalizedMatch[];
  topPlayers: NormalizedPlayerStat[];
  moments: NormalizedMoment[];
  preferences: {
    type: RecapType;
    tone: RecapTone;
    length: RecapLength;
  };
}

// ── Generation pipeline stages (drive real UI progress) ────
export const PIPELINE_STAGES = [
  "QUEUED",
  "COLLECTING_DATA",
  "ANALYZING_PERFORMANCES",
  "FINDING_MOMENTS",
  "WRITING_STORY",
  "PREPARING_VISUALS",
  "RENDERING_VIDEO",
  "FINALIZING",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  QUEUED: "Queued",
  COLLECTING_DATA: "Collecting tournament data",
  ANALYZING_PERFORMANCES: "Analyzing performances",
  FINDING_MOMENTS: "Finding biggest moments",
  WRITING_STORY: "Writing your story",
  PREPARING_VISUALS: "Preparing visuals",
  RENDERING_VIDEO: "Creating highlight video",
  FINALIZING: "Finalizing recap",
};

export const STAGE_PROGRESS: Record<PipelineStage, number> = {
  QUEUED: 0,
  COLLECTING_DATA: 10,
  ANALYZING_PERFORMANCES: 25,
  FINDING_MOMENTS: 40,
  WRITING_STORY: 55,
  PREPARING_VISUALS: 70,
  RENDERING_VIDEO: 85,
  FINALIZING: 97,
};
