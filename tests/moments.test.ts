import { describe, expect, it } from "vitest";
import { computeMoments } from "@/services/moments.service";
import { match, team } from "./helpers";

const A = team({ id: "A", shortName: "ARG", name: "Argentina" });
const B = team({ id: "B", shortName: "FRA", name: "France" });
const C = team({ id: "C", shortName: "NED", name: "Netherlands" });

describe("computeMoments", () => {
  it("scores a late winner higher than an early goal", () => {
    const early = match({
      home: A, away: B, h: 1, a: 0,
      events: [{ type: "GOAL", minute: 10, teamId: "A", playerId: "p1", playerName: "X" }],
    });
    const late = match({
      home: A, away: B, h: 1, a: 0, id: "m-late",
      events: [{ type: "GOAL", minute: 90, extraMinute: 2, teamId: "A", playerId: "p1", playerName: "X" }],
    });
    const [e] = computeMoments([early], { focusTeamId: "A" });
    const [l] = computeMoments([late], { focusTeamId: "A" });
    expect(l.importanceScore).toBeGreaterThan(e.importanceScore);
  });

  it("weights knockout stages above group games", () => {
    const group = match({
      home: A, away: B, h: 2, a: 0,
      events: [{ type: "GOAL", minute: 50, teamId: "A", playerId: "p1" }],
    });
    const final = match({
      home: A, away: B, h: 2, a: 0, stage: "FINAL",
      events: [{ type: "GOAL", minute: 50, teamId: "A", playerId: "p1" }],
    });
    const [g] = computeMoments([group], { focusTeamId: "A" });
    const [f] = computeMoments([final], { focusTeamId: "A" });
    expect(f.importanceScore).toBeGreaterThan(g.importanceScore);
  });

  it("detects equalizers via running scoreline", () => {
    const m = match({
      home: A, away: B, h: 1, a: 1,
      events: [
        { type: "GOAL", minute: 20, teamId: "B", playerId: "pb" },
        { type: "GOAL", minute: 60, teamId: "A", playerId: "pa" },
      ],
    });
    const [eq] = computeMoments([m], { focusTeamId: "A" });
    expect(eq.title.toLowerCase()).toContain("equaliz");
  });

  it("adds a shootout moment for decided knockout draws", () => {
    const m = match({
      home: A, away: C, h: 2, a: 2, hp: 4, ap: 3, stage: "QUARTER_FINAL",
    });
    const moments = computeMoments([m], { focusTeamId: "A" });
    const so = moments.find((x) => x.title.includes("penalties"));
    expect(so).toBeDefined();
    expect(so!.importanceScore).toBeGreaterThan(80);
  });

  it("marks champions and runners-up in the final", () => {
    const m = match({ home: A, away: B, h: 3, a: 3, hp: 4, ap: 2, stage: "FINAL" });
    const win = computeMoments([m], { focusTeamId: "A" });
    const lose = computeMoments([m], { focusTeamId: "B" });
    expect(win.some((x) => x.title === "World Champions" || x.title.includes("penalties"))).toBe(true);
    expect(lose.some((x) => x.title === "Runners-up")).toBe(true);
  });

  it("caps results at the requested limit and orders by score", () => {
    const events = Array.from({ length: 15 }, (_, i) => ({
      type: "GOAL" as const,
      minute: i * 6 + 1,
      teamId: "A",
      playerId: "p1",
    }));
    const m = match({ home: A, away: B, h: 15, a: 0, events });
    const moments = computeMoments([m], { focusTeamId: "A" }, 5);
    expect(moments.length).toBe(5);
    for (let i = 1; i < moments.length; i++) {
      expect(moments[i - 1].importanceScore).toBeGreaterThanOrEqual(moments[i].importanceScore);
    }
  });

  it("filters noise: yellow cards and substitutions never surface", () => {
    const m = match({
      home: A, away: B, h: 0, a: 0,
      events: [
        { type: "YELLOW_CARD", minute: 30, teamId: "A" },
        { type: "SUBSTITUTION", minute: 60, teamId: "A" },
      ],
    });
    expect(computeMoments([m], { focusTeamId: "A" })).toHaveLength(0);
  });
});
