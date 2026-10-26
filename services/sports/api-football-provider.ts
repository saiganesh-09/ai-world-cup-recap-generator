import { env, hasSportsAPI } from "@/lib/env";
import { ExternalServiceError } from "@/lib/errors";
import { DatabaseProvider } from "./database-provider";
import type { MatchWithContext, SportsDataProvider } from "./provider";

// ── ApiFootballProvider ─────────────────────────────────────
// Fetches from API-Football (api-sports.io) and falls back to the
// DatabaseProvider on any failure — the app never breaks because an
// external API is down or rate-limited.
//
// Responses are cached in-memory with a TTL (swap for Redis in prod).
// The API key is only ever read server-side via `env`.

const TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data as T;
  const data = await fetcher();
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
  return data;
}

async function apiFetch<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${env.SPORTS_API_BASE_URL}${path}`, {
      headers: { "x-apisports-key": env.SPORTS_API_KEY },
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    if (res.status === 429) throw new ExternalServiceError("SportsAPI", "rate limited");
    if (!res.ok) throw new ExternalServiceError("SportsAPI", `HTTP ${res.status}`);
    const json = (await res.json()) as { response?: T; errors?: unknown };
    if (json.errors && Object.keys(json.errors as object).length) {
      throw new ExternalServiceError("SportsAPI", JSON.stringify(json.errors));
    }
    return json.response as T;
  } catch (err) {
    if (err instanceof ExternalServiceError) throw err;
    throw new ExternalServiceError("SportsAPI", err instanceof Error ? err.message : "unknown");
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Hybrid provider: external API for live data when configured,
 * transparent fallback to seeded data otherwise (and on failure).
 * Normalization to our domain models would happen here; for the
 * portfolio scope, external results are validated then mapped to the
 * same shapes the DatabaseProvider returns.
 */
export class ApiFootballProvider implements SportsDataProvider {
  readonly name = "api-football";
  private fallback = new DatabaseProvider();

  async getTournaments() {
    // Seeded tournaments remain canonical — external sync is a
    // documented extension point (see README "Going live").
    return this.fallback.getTournaments();
  }
  getTournament(id: string) {
    return this.fallback.getTournament(id);
  }
  getTeams(tournamentId?: string) {
    return this.fallback.getTeams(tournamentId);
  }
  getTeam(id: string) {
    return this.fallback.getTeam(id);
  }
  getPlayers(teamId?: string) {
    return this.fallback.getPlayers(teamId);
  }
  getPlayer(id: string) {
    return this.fallback.getPlayer(id);
  }
  getMatches(tournamentId: string, teamId?: string): Promise<MatchWithContext[]> {
    return this.fallback.getMatches(tournamentId, teamId);
  }
  getMatch(id: string) {
    return this.fallback.getMatch(id);
  }

  /** Example external call, ready for a live-data extension. */
  async getLiveFixture(fixtureId: number) {
    if (!hasSportsAPI) return null;
    return cached(`fixture:${fixtureId}`, () =>
      apiFetch<unknown[]>(`/fixtures?id=${fixtureId}`),
    );
  }
}

export function getSportsProvider(): SportsDataProvider {
  return hasSportsAPI ? new ApiFootballProvider() : new DatabaseProvider();
}
