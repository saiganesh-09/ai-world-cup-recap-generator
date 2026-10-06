import { describe, expect, it } from "vitest";
import { buildTimeline } from "@/services/video/timeline-builder";
import { scoreMoments } from "@/services/moments/importance-scorer";
import { makeMatch, IND } from "../fixtures";
import type { AiRecapOutput, RecapContext } from "@/types";

const story: AiRecapOutput = {
  title: "India — FIFA World Cup 2026 Recap",
  shortSummary: "A dream run summarized here in enough words.",
  tournamentStory: "Paragraph one about the run.\n\nParagraph two.",
  biggestMoments: [{ title: "Chhetri scores", description: "Late winner." }],
  keyPlayers: [{ name: "Sunil Chhetri", note: "Captain fantastic" }],
  turningPoints: [],
  statisticsHighlights: [
    { label: "Record", value: "2W 1D 2L" },
    { label: "Goals", value: "6" },
  ],
  finalVerdict: "A campaign for the ages, told in enough words.",
};

function ctx(): RecapContext {
  return {
    tournament: { id: "t", name: "FIFA World Cup 2026", year: 2026, hostCountry: "USA" },
    focusTeam: IND,
    focusPlayer: null,
    matches: [makeMatch(), makeMatch({ id: "m2" }), makeMatch({ id: "m3" })],
    teamStats: {
      played: 3, won: 2, drawn: 0, lost: 1,
      goalsFor: 4, goalsAgainst: 3, cleanSheets: 1,
      avgPossession: 47, bestFinish: "Semi-final",
    },
    playerStats: [],
    knockoutPath: [],
  };
}

describe("video timeline builder", () => {
  it("contains the full storyboard arc", () => {
    const slides = buildTimeline(ctx(), { type: "TEAM_JOURNEY", tone: "EXCITING", duration: "STANDARD" }, story, []);
    const kinds = slides.map((s) => s.kind);
    expect(kinds[0]).toBe("intro");
    expect(kinds[1]).toBe("subject");
    expect(kinds).toContain("match");
    expect(kinds).toContain("stats");
    expect(kinds).toContain("verdict");
    expect(kinds[kinds.length - 1]).toBe("outro");
  });

  it("scales duration toward the target length", () => {
    const moments = scoreMoments(ctx().matches, { focusTeamId: "ind" });
    const short = buildTimeline(ctx(), { type: "TEAM_JOURNEY", tone: "EXCITING", duration: "SHORT" }, story, moments);
    const extended = buildTimeline(ctx(), { type: "TEAM_JOURNEY", tone: "EXCITING", duration: "EXTENDED" }, story, moments);
    const shortTotal = short.reduce((s, x) => s + x.durationSec, 0);
    const extTotal = extended.reduce((s, x) => s + x.durationSec, 0);
    expect(shortTotal).toBeLessThan(extTotal);
    expect(shortTotal).toBeGreaterThan(40);
    expect(shortTotal).toBeLessThan(90);
  });

  it("caps match and moment slides by duration tier", () => {
    const moments = scoreMoments(ctx().matches, { focusTeamId: "ind" });
    const short = buildTimeline(ctx(), { type: "TEAM_JOURNEY", tone: "EXCITING", duration: "SHORT" }, story, moments);
    expect(short.filter((s) => s.kind === "match").length).toBeLessThanOrEqual(4);
    expect(short.filter((s) => s.kind === "moment").length).toBeLessThanOrEqual(2);
  });
});
