import { z } from "zod";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { ExternalServiceError } from "@/lib/errors";
import { invalidateCache } from "@/lib/cache";
import { DemoDataProvider } from "./demo-provider";
import type { SportsDataProvider } from "./provider";
import type { MatchStage, EventType, Position } from "@prisma/client";

/**
 * ApiFootballProvider — ingests API-Football compatible data into the
 * local normalized Postgres store, then serves reads from the DB like
 * the demo provider.
 *
 * Why ingest-then-read? Every downstream consumer (AI context, moment
 * scoring, video, recaps) gets stable local IDs and consistent joins,
 * and we keep working when the upstream API rate-limits or goes down.
 */

// ── Light response validation (fail fast on malformed payloads) ──────

const apiTeam = z.object({
  team: z.object({
    id: z.number(),
    name: z.string(),
    code: z.string().nullable(),
    country: z.string().nullable(),
    logo: z.string().nullable(),
  }),
});

const apiFixture = z.object({
  fixture: z.object({
    id: z.number(),
    date: z.string(),
    venue: z.object({ name: z.string().nullable() }).nullable(),
    status: z.object({ short: z.string() }),
  }),
  league: z.object({ round: z.string() }),
  teams: z.object({
    home: z.object({ id: z.number(), name: z.string() }),
    away: z.object({ id: z.number(), name: z.string() }),
  }),
  goals: z.object({
    home: z.number().nullable(),
    away: z.number().nullable(),
  }),
  score: z
    .object({
      penalty: z.object({
        home: z.number().nullable(),
        away: z.number().nullable(),
      }),
    })
    .partial(),
});

const apiEvent = z.object({
  time: z.object({ elapsed: z.number().nullable() }),
  team: z.object({ id: z.number() }).nullable(),
  player: z.object({ id: z.number().nullable(), name: z.string().nullable() }).nullable(),
  assist: z.object({ id: z.number().nullable(), name: z.string().nullable() }).nullable(),
  type: z.string(),
  detail: z.string().nullable(),
});

const apiStatistic = z.object({
  team: z.object({ id: z.number() }),
  statistics: z.array(
    z.object({ type: z.string(), value: z.union([z.number(), z.string(), z.null()]) }),
  ),
});

const apiPlayer = z.object({
  player: z.object({
    id: z.number(),
    name: z.string(),
    position: z.string().nullable(),
    number: z.number().nullable(),
    photo: z.string().nullable(),
    age: z.number().nullable(),
  }),
});

interface FetchOpts {
  path: string;
  params?: Record<string, string | number>;
}

export class ApiFootballProvider implements SportsDataProvider {
  readonly kind = "api" as const;
  private reader = new DemoDataProvider();
  private synced: Promise<void> | null = null;

  private get env() {
    return getEnv();
  }

  private async fetchJson<T>({ path, params }: FetchOpts): Promise<T> {
    const url = new URL(`${this.env.SPORTS_API_BASE_URL}${path}`);
    for (const [k, v] of Object.entries(params ?? {})) {
      url.searchParams.set(k, String(v));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(url.toString(), {
        headers: { "x-apisports-key": this.env.SPORTS_API_KEY },
        signal: controller.signal,
      });
      if (res.status === 429) {
        throw new ExternalServiceError("Sports API", "rate limit reached");
      }
      if (!res.ok) {
        throw new ExternalServiceError("Sports API", `HTTP ${res.status}`);
      }
      const body = (await res.json()) as { response?: T; errors?: unknown };
      if (body.errors && Object.keys(body.errors as object).length > 0) {
        throw new ExternalServiceError("Sports API", "upstream error");
      }
      return body.response as T;
    } catch (err) {
      if (err instanceof ExternalServiceError) throw err;
      throw new ExternalServiceError(
        "Sports API",
        err instanceof Error ? err.message : "network failure",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /** Idempotent ingest — runs once per process, memoized. */
  private ensureSynced(): Promise<void> {
    this.synced ??= this.sync().catch((err) => {
      // Reset so a later call can retry.
      this.synced = null;
      throw err;
    });
    return this.synced;
  }

  private stageFromRound(round: string): MatchStage {
    const r = round.toLowerCase();
    if (r.includes("final") && !r.includes("semi") && !r.includes("quarter"))
      return r.includes("3rd") || r.includes("third") ? "THIRD_PLACE" : "FINAL";
    if (r.includes("semi")) return "SEMI_FINAL";
    if (r.includes("quarter")) return "QUARTER_FINAL";
    if (r.includes("8th") || r.includes("16")) return "ROUND_OF_16";
    return "GROUP";
  }

  private eventType(type: string, detail: string | null): EventType | null {
    const t = type.toLowerCase();
    const d = (detail ?? "").toLowerCase();
    if (t === "goal") {
      if (d.includes("penalty")) return "PENALTY_GOAL";
      if (d.includes("own")) return "OWN_GOAL";
      return "GOAL";
    }
    if (t === "card") return d.includes("red") ? "RED_CARD" : "YELLOW_CARD";
    if (t === "subst") return "SUBSTITUTION";
    if (t === "var" && d.includes("penalty")) return null; // skip VAR noise
    return null;
  }

  private positionFrom(p: string | null): Position {
    const v = (p ?? "").toLowerCase();
    if (v.includes("goalkeeper")) return "GK";
    if (v.includes("defender")) return "DF";
    if (v.includes("midfielder")) return "MF";
    return "FW";
  }

  private async sync(): Promise<void> {
    const env = this.env;
    const tournament =
      (await prisma.tournament.findFirst({
        where: { isDemo: false, year: Number(env.SPORTS_API_SEASON) },
      })) ??
      (await prisma.tournament.create({
        data: {
          name: "FIFA World Cup",
          year: Number(env.SPORTS_API_SEASON),
          hostCountry: "USA · Canada · Mexico",
          startDate: new Date(`${env.SPORTS_API_SEASON}-06-01`),
          endDate: new Date(`${env.SPORTS_API_SEASON}-07-31`),
          status: "COMPLETED",
          isDemo: false,
        },
      }));

    // 1. Teams
    const teams = await this.fetchJson<unknown[]>({
      path: "/teams",
      params: { league: env.SPORTS_API_LEAGUE_ID, season: env.SPORTS_API_SEASON },
    });
    const teamIdMap = new Map<number, string>();
    for (const raw of teams) {
      const { team } = apiTeam.parse(raw);
      const shortName = (team.code ?? team.name.slice(0, 3)).toUpperCase();
      const existing = await prisma.team.findUnique({
        where: { name: team.name },
      });
      const record =
        existing ??
        (await prisma.team.create({
          data: {
            name: team.name,
            shortName,
            country: team.country ?? team.name,
            flag: "🏳️",
            logo: team.logo,
          },
        }));
      teamIdMap.set(team.id, record.id);
    }

    // 2. Players (per team — best effort, capped)
    for (const [apiTeamId, teamId] of teamIdMap) {
      const players = await this.fetchJson<unknown[]>({
        path: "/players",
        params: {
          team: apiTeamId,
          league: env.SPORTS_API_LEAGUE_ID,
          season: env.SPORTS_API_SEASON,
        },
      }).catch(() => []);
      for (const raw of players.slice(0, 23)) {
        const { player } = apiPlayer.parse(raw);
        await prisma.player.create({
          data: {
            name: player.name,
            teamId,
            position: this.positionFrom(player.position),
            jerseyNumber: player.number ?? 0,
            photo: player.photo,
            age: player.age,
          },
        });
      }
    }
    const playersByName = new Map(
      (await prisma.player.findMany()).map((p) => [
        `${p.teamId}:${p.name}`,
        p.id,
      ]),
    );

    // 3. Fixtures → matches + events + team stats
    const fixtures = await this.fetchJson<unknown[]>({
      path: "/fixtures",
      params: { league: env.SPORTS_API_LEAGUE_ID, season: env.SPORTS_API_SEASON },
    });

    for (const raw of fixtures) {
      const f = apiFixture.parse(raw);
      const homeTeamId = teamIdMap.get(f.teams.home.id);
      const awayTeamId = teamIdMap.get(f.teams.away.id);
      if (!homeTeamId || !awayTeamId) continue;
      const finished = ["FT", "AET", "PEN"].includes(f.fixture.status.short);

      const match = await prisma.match.create({
        data: {
          tournamentId: tournament.id,
          homeTeamId,
          awayTeamId,
          date: new Date(f.fixture.date),
          venue: f.fixture.venue?.name ?? "TBD",
          stage: this.stageFromRound(f.league.round),
          status: finished ? "FINISHED" : "SCHEDULED",
          homeScore: f.goals.home ?? 0,
          awayScore: f.goals.away ?? 0,
          homePenalties: f.score.penalty?.home ?? null,
          awayPenalties: f.score.penalty?.away ?? null,
        },
      });

      // Events
      const events = await this.fetchJson<unknown[]>({
        path: "/fixtures/events",
        params: { fixture: f.fixture.id },
      }).catch(() => []);
      for (const rawEv of events) {
        const ev = apiEvent.safeParse(rawEv);
        if (!ev.success) continue;
        const type = this.eventType(ev.data.type, ev.data.detail);
        if (!type) continue;
        const evTeamId = ev.data.team ? teamIdMap.get(ev.data.team.id) : null;
        const playerId = ev.data.player?.name
          ? (playersByName.get(`${evTeamId}:${ev.data.player.name}`) ?? null)
          : null;
        const assistId = ev.data.assist?.name
          ? (playersByName.get(`${evTeamId}:${ev.data.assist.name}`) ?? null)
          : null;
        await prisma.matchEvent.create({
          data: {
            matchId: match.id,
            minute: ev.data.time.elapsed ?? 0,
            type,
            teamId: evTeamId ?? null,
            playerId,
            assistPlayerId: assistId,
            description:
              ev.data.detail ??
              `${type} — ${ev.data.player?.name ?? "unknown"}`,
          },
        });
      }

      // Team stats
      const stats = await this.fetchJson<unknown[]>({
        path: "/fixtures/statistics",
        params: { fixture: f.fixture.id },
      }).catch(() => []);
      for (const rawSt of stats) {
        const st = apiStatistic.safeParse(rawSt);
        if (!st.success) continue;
        const teamId = teamIdMap.get(st.data.team.id);
        if (!teamId) continue;
        const get = (name: string) => {
          const v = st.data.statistics.find((s) => s.type === name)?.value;
          if (typeof v === "number") return v;
          if (typeof v === "string") return parseInt(v) || 0;
          return 0;
        };
        await prisma.teamMatchStat.create({
          data: {
            teamId,
            matchId: match.id,
            possession: get("Ball Possession"),
            shots: get("Total Shots"),
            shotsOnTarget: get("Shots on Goal"),
            corners: get("Corner Kicks"),
            fouls: get("Fouls"),
          },
        });
      }
    }

    invalidateCache();
  }

  // ── Reads: sync-then-delegate to the local store ───────────────────

  async getTournaments() {
    await this.ensureSynced();
    return this.reader.getTournaments();
  }
  async getTournament(id: string) {
    await this.ensureSynced();
    return this.reader.getTournament(id);
  }
  async getTeams(tournamentId?: string) {
    await this.ensureSynced();
    return this.reader.getTeams(tournamentId);
  }
  async getTeam(id: string) {
    await this.ensureSynced();
    return this.reader.getTeam(id);
  }
  async getPlayers(opts?: { teamId?: string; tournamentId?: string }) {
    await this.ensureSynced();
    return this.reader.getPlayers(opts);
  }
  async getPlayer(id: string) {
    await this.ensureSynced();
    return this.reader.getPlayer(id);
  }
  async getMatches(opts?: { tournamentId?: string; teamId?: string }) {
    await this.ensureSynced();
    return this.reader.getMatches(opts);
  }
  async getMatch(id: string) {
    await this.ensureSynced();
    return this.reader.getMatch(id);
  }
  async getTeamTournamentStats(teamId: string, tournamentId: string) {
    await this.ensureSynced();
    return this.reader.getTeamTournamentStats(teamId, tournamentId);
  }
}
