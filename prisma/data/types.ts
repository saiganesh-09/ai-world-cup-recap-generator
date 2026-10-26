// Seed data types — kept independent of Prisma so data files
// stay portable and easy to extend for new tournaments.

export type SeedPosition = "GK" | "DF" | "MF" | "FW";

export interface SeedPlayer {
  name: string;
  pos: SeedPosition;
  no: number;
  age?: number;
}

export interface SeedTeam {
  /** stable slug used to reference the team inside match data */
  ref: string;
  name: string;
  short: string;
  country: string;
  flag: string;
  color: string;
  group?: string;
  players: SeedPlayer[];
}

export type SeedEventType =
  | "GOAL"
  | "PENALTY_GOAL"
  | "PENALTY_MISS"
  | "OWN_GOAL"
  | "YELLOW_CARD"
  | "RED_CARD"
  | "SUBSTITUTION"
  | "MILESTONE";

export interface SeedEvent {
  min: number;
  /** additional stoppage/extra minutes, e.g. 90+4 */
  extraMinute?: number;
  type: SeedEventType;
  /** team ref that the event belongs to */
  team: string;
  /** player name — must match a seeded player, else the event is unattributed */
  player?: string;
  detail?: string;
  description?: string;
}

export interface SeedMatch {
  home: string;
  away: string;
  h: number;
  a: number;
  /** shootout scores for knockout draws decided on penalties */
  hp?: number;
  ap?: number;
  date: string; // ISO date
  venue: string;
  stage:
    | "GROUP"
    | "ROUND_OF_16"
    | "QUARTER_FINAL"
    | "SEMI_FINAL"
    | "THIRD_PLACE"
    | "FINAL";
  group?: string;
  events?: SeedEvent[];
}

export interface SeedTournament {
  name: string;
  year: number;
  country: string;
  startDate: string;
  endDate: string;
  isDemo: boolean;
  teams: SeedTeam[];
  matches: SeedMatch[];
}
