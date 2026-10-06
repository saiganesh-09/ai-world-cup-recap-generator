import type {
  EventType,
  MatchStage,
  MatchStatus,
  Position,
  RecapDuration,
  RecapTone,
  RecapType,
} from "@prisma/client";

// ─── Normalized provider DTOs ────────────────────────────────────────
// Everything the AI/video pipelines consume is normalized into these
// shapes — regardless of whether data came from the demo DB or a
// live sports API.

export interface TeamRef {
  id: string;
  name: string;
  shortName: string;
  country: string;
  flag: string;
  primaryColor: string;
  accentColor: string;
  fifaRanking: number | null;
}

export interface PlayerRef {
  id: string;
  name: string;
  position: Position;
  jerseyNumber: number;
  isStar: boolean;
}

export interface NormalizedMatch {
  id: string;
  date: string; // ISO
  venue: string;
  stage: MatchStage;
  status: MatchStatus;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  homeScore: number;
  awayScore: number;
  homePenalties: number | null;
  awayPenalties: number | null;
  events: NormalizedEvent[];
  homeStats: TeamStatsLine | null;
  awayStats: TeamStatsLine | null;
}

export interface NormalizedEvent {
  id: string;
  minute: number;
  type: EventType;
  teamId: string | null;
  playerId: string | null;
  playerName: string | null;
  assistPlayerId: string | null;
  assistPlayerName: string | null;
  description: string;
}

export interface TeamStatsLine {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
}

export interface PlayerTournamentStats {
  player: PlayerRef;
  teamId: string;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  shots: number;
  tackles: number;
  avgRating: number;
}

export interface TeamTournamentStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  avgPossession: number;
  bestFinish: string; // e.g. "Semi-final", "Champions", "Group Stage"
}

/** The full context handed to the AI + video pipelines. */
export interface RecapContext {
  tournament: {
    id: string;
    name: string;
    year: number;
    hostCountry: string;
  };
  focusTeam: TeamRef | null;
  focusPlayer: (PlayerRef & { team: TeamRef }) | null;
  // matches involving the focus team/player (or all headline matches
  // for tournament-wide recap types)
  matches: NormalizedMatch[];
  teamStats: TeamTournamentStats | null;
  playerStats: PlayerTournamentStats[];
  knockoutPath: NormalizedMatch[]; // matches past the group stage
}

// ─── Moment scoring ──────────────────────────────────────────────────

export interface ScoredMoment {
  matchId: string;
  minute: number | null;
  title: string;
  description: string;
  importanceScore: number; // 0–100
  playerId: string | null;
  playerName: string | null;
  teamName: string | null;
  eventType: EventType | "RESULT" | "MILESTONE";
  scoreline: string;
  stage: MatchStage;
}

// ─── AI output ───────────────────────────────────────────────────────

export interface AiMoment {
  title: string;
  description: string;
  minute?: number;
  matchLabel?: string;
}

export interface AiRecapOutput {
  title: string;
  shortSummary: string;
  tournamentStory: string;
  biggestMoments: AiMoment[];
  keyPlayers: { name: string; note: string }[];
  turningPoints: { title: string; description: string }[];
  statisticsHighlights: { label: string; value: string; note?: string }[];
  finalVerdict: string;
}

export interface RecapPreferences {
  type: RecapType;
  tone: RecapTone;
  duration: RecapDuration;
}

// ─── Video timeline ──────────────────────────────────────────────────

export interface VideoSlide {
  kind:
    | "intro"
    | "subject"
    | "match"
    | "moment"
    | "player"
    | "stats"
    | "verdict"
    | "outro";
  durationSec: number;
  title: string;
  subtitle?: string;
  body?: string[];
  // optional structured payloads rendered per-kind
  match?: {
    home: string;
    away: string;
    score: string;
    stage: string;
    venue: string;
  };
  statLines?: { label: string; value: string }[];
  accent?: string;
  image?: string;
  /** 3-letter crest code for subject slides (e.g. "IND") */
  code?: string;
}

export interface VideoJobPayload {
  recapId: string;
  slides: VideoSlide[];
  narration?: { slideIndex: number; file: string; delaySec: number }[];
  outFile: string;
}
