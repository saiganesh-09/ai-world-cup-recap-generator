import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { DemoDataProvider } from "@/services/sports/demo-provider";
import { buildRecapContext } from "@/services/recap/context-builder";
import { createRecap } from "@/services/recap/recap-service";
import { invalidateCache } from "@/lib/cache";

/**
 * Integration tests run against the real seeded dev database
 * (npm run db:start + db:seed). They're skipped automatically when the
 * DB isn't reachable so `npm test` never fails in a bare checkout.
 */
let dbUp = false;
const provider = new DemoDataProvider();
const prefs = { type: "TEAM_JOURNEY" as const, tone: "EXCITING" as const, duration: "SHORT" as const };

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbUp = true;
  } catch {
    dbUp = false;
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

const skipIfNoDb = () => {
  if (!dbUp) {
    console.warn("DB not reachable — skipping integration test");
    return true;
  }
  return false;
};

describe("demo provider (real DB)", () => {
  it("serves the seeded tournament dataset", async () => {
    if (skipIfNoDb()) return;
    const tournaments = await provider.getTournaments();
    expect(tournaments.length).toBeGreaterThan(0);
    const teams = await provider.getTeams(tournaments[0].id);
    expect(teams.length).toBeGreaterThanOrEqual(8);
    const matches = await provider.getMatches({ tournamentId: tournaments[0].id });
    expect(matches.length).toBeGreaterThanOrEqual(16);
  });

  it("computes team tournament stats correctly", async () => {
    if (skipIfNoDb()) return;
    const [tournament] = await provider.getTournaments();
    const india = (await provider.getTeams(tournament.id)).find(
      (t) => t.name === "India",
    )!;
    const stats = await provider.getTeamTournamentStats(india.id, tournament.id);
    expect(stats).not.toBeNull();
    expect(stats!.played).toBe(5);
    expect(stats!.bestFinish).toBe("Third place");
    expect(stats!.won + stats!.drawn + stats!.lost).toBe(stats!.played);
  });

  it("builds a normalized recap context", async () => {
    if (skipIfNoDb()) return;
    const [tournament] = await provider.getTournaments();
    const india = (await provider.getTeams(tournament.id)).find(
      (t) => t.name === "India",
    )!;
    const ctx = await buildRecapContext({
      tournamentId: tournament.id,
      teamId: india.id,
      prefs,
    });
    expect(ctx.focusTeam?.name).toBe("India");
    expect(ctx.matches.length).toBe(5);
    expect(ctx.knockoutPath.length).toBe(2); // SF + 3rd place
    expect(ctx.playerStats.length).toBeGreaterThan(0);
  });
});

describe("recap service (real DB)", () => {
  it("creates and cleans up a recap with validation", async () => {
    if (skipIfNoDb()) return;
    const user = await prisma.user.findFirst();
    const [tournament] = await provider.getTournaments();
    const india = (await provider.getTeams(tournament.id)).find(
      (t) => t.name === "India",
    )!;
    invalidateCache();

    const recap = await createRecap(user!.id, {
      tournamentId: tournament.id,
      teamId: india.id,
      type: "TEAM_JOURNEY",
      tone: "EXCITING",
      duration: "SHORT",
    });
    expect(recap.status).toBe("DRAFT");
    expect(recap.userId).toBe(user!.id);

    await prisma.recap.delete({ where: { id: recap.id } });
    const gone = await prisma.recap.findUnique({ where: { id: recap.id } });
    expect(gone).toBeNull();
  });

  it("rejects an invalid selection", async () => {
    if (skipIfNoDb()) return;
    const user = await prisma.user.findFirst();
    await expect(
      createRecap(user!.id, {
        tournamentId: "nonexistent",
        type: "TOURNAMENT_HIGHLIGHTS",
        tone: "EXCITING",
        duration: "SHORT",
      }),
    ).rejects.toThrow();
  });
});
