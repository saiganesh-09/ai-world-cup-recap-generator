import { describe, expect, it } from "vitest";
import { generateFallbackStory } from "@/services/ai/fallback";
import { parseRecapStory, recapStorySchema } from "@/services/ai/schemas";
import { computeMoments } from "@/services/moments.service";
import { normalizeMatch, playerStats, teamStats } from "@/services/stats.service";
import { match, team } from "./helpers";
import type { RecapContext } from "@/types/domain";

const A = team({ id: "A", shortName: "ARG", name: "Argentina" });
const B = team({ id: "B", shortName: "FRA", name: "France" });

const matches = [
  match({ home: A, away: B, h: 3, a: 3, hp: 4, ap: 2, stage: "FINAL",
    events: [{ type: "GOAL", minute: 108, teamId: "A", playerId: "p1", playerName: "Messi" }] }),
];

const ctx: RecapContext = {
  tournament: { id: "t", name: "FIFA World Cup 2022", year: 2022, country: "Qatar", isDemo: false },
  focusTeam: {
    id: "A", name: "Argentina", shortName: "ARG", flagEmoji: "🇦🇷",
    primaryColor: "#75AADB", stats: teamStats(matches, "A"),
  },
  focusPlayer: null,
  matches: matches.map((m) => normalizeMatch(m, "A")),
  topPlayers: playerStats([
    { minutes: 120, goals: 2, assists: 0, shots: 5, tackles: 0, rating: 9.2,
      player: { id: "p1", name: "Lionel Messi", position: "FW", jerseyNumber: 10 } },
  ]),
  moments: computeMoments(matches, { focusTeamId: "A" }),
  preferences: { type: "TEAM_JOURNEY", tone: "EXCITING", length: "STANDARD" },
};

describe("recapStorySchema", () => {
  const valid = {
    title: "Argentina's World Cup Journey",
    shortSummary: "A historic run to the trophy.",
    tournamentStory: "Argentina won the World Cup after an epic final.",
    biggestMoments: ["Messi's extra-time goal", "The shootout"],
    keyPlayers: [{ name: "Messi", note: "7 goals" }],
    turningPoints: ["The Saudi upset"],
    statisticsHighlights: ["7 goals for Messi", "15 total goals"],
    finalVerdict: "A deserved title.",
  };

  it("accepts a well-formed story", () => {
    expect(() => parseRecapStory(valid)).not.toThrow();
  });

  it("rejects missing fields", () => {
    const broken = { ...valid } as Record<string, unknown>;
    delete broken.finalVerdict;
    expect(() => parseRecapStory(broken)).toThrow();
  });

  it("rejects wrong types", () => {
    expect(() => parseRecapStory({ ...valid, biggestMoments: "not an array" })).toThrow();
  });

  it("rejects empty biggestMoments", () => {
    expect(() => parseRecapStory({ ...valid, biggestMoments: [] })).toThrow();
  });
});

describe("generateFallbackStory", () => {
  it("produces a schema-valid story without any LLM", () => {
    const story = generateFallbackStory(ctx);
    expect(() => recapStorySchema.parse(story)).not.toThrow();
    expect(story.title).toContain("Argentina");
    expect(story.tournamentStory.length).toBeGreaterThan(40);
  });

  it("references real context: champions, players, moments", () => {
    const story = generateFallbackStory(ctx);
    expect(story.finalVerdict.toLowerCase()).toContain("champion");
    expect(story.keyPlayers[0].name).toBe("Lionel Messi");
    expect(story.biggestMoments.length).toBeGreaterThan(0);
  });
});
