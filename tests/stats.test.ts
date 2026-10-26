import { describe, expect, it } from "vitest";
import { matchResult, playerStats, teamStats } from "@/services/stats.service";
import { match, team } from "./helpers";

const A = team({ id: "A", shortName: "ARG", name: "Argentina" });
const B = team({ id: "B", shortName: "FRA", name: "France" });
const C = team({ id: "C", shortName: "KSA", name: "Saudi Arabia" });

describe("matchResult", () => {
  it("detects wins and losses from the team's perspective", () => {
    const m = match({ home: A, away: B, h: 3, a: 1 });
    expect(matchResult(m, "A")).toBe("W");
    expect(matchResult(m, "B")).toBe("L");
  });

  it("resolves draws via shootout", () => {
    const m = match({ home: A, away: B, h: 3, a: 3, hp: 4, ap: 2 });
    expect(matchResult(m, "A")).toBe("W");
    expect(matchResult(m, "B")).toBe("L");
  });

  it("plain draw stays a draw", () => {
    const m = match({ home: A, away: B, h: 0, a: 0 });
    expect(matchResult(m, "A")).toBe("D");
  });
});

describe("teamStats", () => {
  it("aggregates record, goals and clean sheets", () => {
    const matches = [
      match({ home: A, away: B, h: 2, a: 0 }),
      match({ home: C, away: A, h: 1, a: 1 }),
      match({ home: A, away: C, h: 0, a: 1, stage: "FINAL" }),
    ];
    const s = teamStats(matches, "A");
    expect(s.played).toBe(3);
    expect(s.wins).toBe(1);
    expect(s.draws).toBe(1);
    expect(s.losses).toBe(1);
    expect(s.goalsFor).toBe(3);
    expect(s.goalsAgainst).toBe(2);
    expect(s.cleanSheets).toBe(1);
    expect(s.furthestStage).toBe("FINAL");
    expect(s.champion).toBe(false);
  });

  it("marks the final winner as champion", () => {
    const matches = [match({ home: A, away: B, h: 1, a: 0, stage: "FINAL" })];
    expect(teamStats(matches, "A").champion).toBe(true);
    expect(teamStats(matches, "B").champion).toBe(false);
  });
});

describe("playerStats", () => {
  it("aggregates per-player tournament stats and sorts by output", () => {
    const rows = [
      { minutes: 90, goals: 2, assists: 0, shots: 4, tackles: 1, rating: 8.5,
        player: { id: "p1", name: "Messi", position: "FW" as const, jerseyNumber: 10 } },
      { minutes: 90, goals: 1, assists: 1, shots: 3, tackles: 0, rating: 8.0,
        player: { id: "p1", name: "Messi", position: "FW" as const, jerseyNumber: 10 } },
      { minutes: 90, goals: 0, assists: 2, shots: 1, tackles: 2, rating: 7.5,
        player: { id: "p2", name: "De Paul", position: "MF" as const, jerseyNumber: 7 } },
    ];
    const agg = playerStats(rows);
    expect(agg[0].name).toBe("Messi");
    expect(agg[0].goals).toBe(3);
    expect(agg[0].appearances).toBe(2);
    expect(agg[0].avgRating).toBeCloseTo(8.25);
    expect(agg[1].assists).toBe(2);
  });
});
