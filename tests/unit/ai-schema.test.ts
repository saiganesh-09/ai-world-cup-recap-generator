import { describe, expect, it } from "vitest";
import { parseAiRecap } from "@/services/ai/schemas";

const valid = {
  title: "India's World Cup Journey",
  shortSummary: "A dream run to the semifinals and a bronze medal for the ages.",
  tournamentStory:
    "India arrived at the World Cup ranked 121st and left as bronze medalists. " +
    "It began with a stunning 2-1 win over Japan, Chhetri's 89th-minute winner " +
    "setting the tone for a run nobody saw coming.",
  biggestMoments: [
    {
      title: "Chhetri scores (89')",
      description: "The captain's late winner sealed a famous upset.",
      minute: 89,
      matchLabel: "IND 2–1 JPN",
    },
  ],
  keyPlayers: [{ name: "Sunil Chhetri", note: "2 crucial goals, captain's run" }],
  turningPoints: [
    { title: "The Japan upset", description: "Everything changed in Seattle." },
  ],
  statisticsHighlights: [
    { label: "Best finish", value: "Third place" },
    { label: "Record", value: "2W 1D 2L" },
  ],
  finalVerdict: "A campaign that rewrote what's possible for Indian football.",
};

describe("AI output validation", () => {
  it("accepts a well-formed recap", () => {
    const parsed = parseAiRecap(valid);
    expect(parsed.title).toBe(valid.title);
    expect(parsed.biggestMoments).toHaveLength(1);
  });

  it("rejects malformed output — missing required fields", () => {
    expect(() => parseAiRecap({ title: "Only a title" })).toThrow();
  });

  it("rejects non-object payloads", () => {
    expect(() => parseAiRecap("not json")).toThrow();
    expect(() => parseAiRecap(null)).toThrow();
    expect(() => parseAiRecap(42)).toThrow();
  });

  it("rejects empty biggestMoments", () => {
    expect(() =>
      parseAiRecap({ ...valid, biggestMoments: [] }),
    ).toThrow();
  });

  it("rejects absurd minutes", () => {
    expect(() =>
      parseAiRecap({
        ...valid,
        biggestMoments: [{ ...valid.biggestMoments[0], minute: 500 }],
      }),
    ).toThrow();
  });
});
