import { describe, expect, it } from "vitest";
import { generateFallbackRecap } from "@/services/ai/fallback-generator";
import { scoreMoments } from "@/services/moments/importance-scorer";
import { parseAiRecap } from "@/services/ai/schemas";
import { makeMatch, IND } from "../fixtures";
import type { RecapContext } from "@/types";

function makeCtx(): RecapContext {
  return {
    tournament: {
      id: "t1",
      name: "FIFA World Cup 2026",
      year: 2026,
      hostCountry: "USA · Canada · Mexico",
    },
    focusTeam: IND,
    focusPlayer: null,
    matches: [makeMatch()],
    teamStats: {
      played: 5,
      won: 2,
      drawn: 1,
      lost: 2,
      goalsFor: 6,
      goalsAgainst: 8,
      cleanSheets: 0,
      avgPossession: 46,
      bestFinish: "Third place",
    },
    playerStats: [
      {
        player: {
          id: "p2",
          name: "Sunil Chhetri",
          position: "FW",
          jerseyNumber: 11,
          isStar: true,
        },
        teamId: "ind",
        appearances: 5,
        minutes: 430,
        goals: 3,
        assists: 1,
        shots: 12,
        tackles: 2,
        avgRating: 7.8,
      },
    ],
    knockoutPath: [],
  };
}

const prefs = { type: "TEAM_JOURNEY" as const, tone: "PROFESSIONAL" as const, duration: "STANDARD" as const };

describe("deterministic fallback generator", () => {
  it("produces output that passes the AI schema", () => {
    const moments = scoreMoments(makeCtx().matches, { focusTeamId: "ind" });
    const out = generateFallbackRecap(makeCtx(), prefs, moments);
    expect(() => parseAiRecap(out)).not.toThrow();
  });

  it("uses real numbers — never invents statistics", () => {
    const ctx = makeCtx();
    const moments = scoreMoments(ctx.matches, { focusTeamId: "ind" });
    const out = generateFallbackRecap(ctx, prefs, moments);
    expect(out.tournamentStory).toContain("2");
    expect(out.tournamentStory).toContain("2 defeats");
    const stats = out.statisticsHighlights.map((s) => s.value).join(" ");
    expect(stats).toContain("2W · 1D · 2L");
    expect(stats).toContain("Third place");
  });

  it("includes the top scored moments", () => {
    const ctx = makeCtx();
    const moments = scoreMoments(ctx.matches, { focusTeamId: "ind" });
    const out = generateFallbackRecap(ctx, prefs, moments);
    expect(out.biggestMoments.length).toBeGreaterThan(0);
    expect(out.biggestMoments.length).toBeLessThanOrEqual(5);
  });

  it("names the subject in the title", () => {
    const moments = scoreMoments(makeCtx().matches, { focusTeamId: "ind" });
    const out = generateFallbackRecap(makeCtx(), prefs, moments);
    expect(out.title).toContain("India");
  });
});
