import { describe, expect, it } from "vitest";
import { scoreMoments } from "@/services/moments/importance-scorer";
import { makeMatch, IND, BRA } from "../fixtures";

describe("moment importance engine", () => {
  it("scores a late winning goal higher than an equalizer", () => {
    const moments = scoreMoments([makeMatch()], {
      focusTeamId: "ind",
      threshold: 0,
    });
    const winner = moments.find((m) => m.title.includes("Chhetri"));
    const equalizer = moments.find((m) => m.title.includes("Mitoma"));
    expect(winner).toBeDefined();
    expect(equalizer).toBeDefined();
    expect(winner!.importanceScore).toBeGreaterThan(
      equalizer!.importanceScore,
    );
  });

  it("detects a major upset from the ranking gap", () => {
    // India (121) beats Japan (15) — a >100 place upset
    const moments = scoreMoments([makeMatch()], {
      focusTeamId: "ind",
      threshold: 0,
    });
    const upset = moments.find((m) => m.eventType === "RESULT");
    expect(upset).toBeDefined();
    expect(upset!.title).toContain("stun");
    expect(upset!.importanceScore).toBeGreaterThanOrEqual(80);
  });

  it("does not flag an upset when the favorite wins", () => {
    // Brazil (5) beats India (121) — expected result
    const match = makeMatch({
      homeTeam: BRA,
      awayTeam: IND,
      homeScore: 2,
      awayScore: 0,
      events: [
        {
          id: "g1",
          minute: 23,
          type: "GOAL",
          teamId: "bra",
          playerId: "v",
          playerName: "Vinícius",
          assistPlayerId: null,
          assistPlayerName: null,
          description: "Vinícius scores",
        },
      ],
    });
    const moments = scoreMoments([match], { focusTeamId: "bra", threshold: 0 });
    expect(moments.some((m) => m.title.includes("stun"))).toBe(false);
  });

  it("amplifies knockout-stage events over group-stage ones", () => {
    // A consolation goal at 30' while losing — low situational bonuses,
    // so the stage multiplier is visible before the 100 clamp.
    const consolationEvent = (id: string) => ({
      id,
      minute: 30,
      type: "GOAL" as const,
      teamId: "ind",
      playerId: "p1",
      playerName: "Scorer",
      assistPlayerId: null,
      assistPlayerName: null,
      description: "Consolation goal",
    });
    const group = makeMatch({
      homeScore: 1,
      awayScore: 3,
      events: [consolationEvent("g1")],
    });
    const semi = makeMatch({
      id: "m2",
      stage: "SEMI_FINAL",
      homeScore: 1,
      awayScore: 3,
      events: [consolationEvent("s1")],
    });
    const gm = scoreMoments([group], { focusTeamId: "ind", threshold: 0 });
    const sm = scoreMoments([semi], { focusTeamId: "ind", threshold: 0 });
    const gGoal = gm.find((m) => m.eventType === "GOAL")!;
    const sGoal = sm.find((m) => m.eventType === "GOAL")!;
    expect(sGoal.importanceScore).toBeGreaterThan(gGoal.importanceScore);
  });

  it("respects the threshold and limit", () => {
    const moments = scoreMoments([makeMatch()], {
      focusTeamId: "ind",
      threshold: 85,
      limit: 2,
    });
    expect(moments.length).toBeLessThanOrEqual(2);
    for (const m of moments) expect(m.importanceScore).toBeGreaterThanOrEqual(85);
  });

  it("clamps scores to [0,100]", () => {
    const moments = scoreMoments([makeMatch()], {
      focusTeamId: "ind",
      threshold: 0,
    });
    for (const m of moments) {
      expect(m.importanceScore).toBeGreaterThanOrEqual(0);
      expect(m.importanceScore).toBeLessThanOrEqual(100);
    }
  });

  it("awards a star-player bonus", () => {
    // A first-half equalizer — mid-range score where +8 star bonus
    // shows before the 100 clamp.
    const match = makeMatch({
      homeScore: 1,
      awayScore: 1,
      events: [
        {
          id: "j1",
          minute: 10,
          type: "GOAL",
          teamId: "jpn",
          playerId: "x",
          playerName: "Opponent",
          assistPlayerId: null,
          assistPlayerName: null,
          description: "Early Japan goal",
        },
        {
          id: "i1",
          minute: 40,
          type: "GOAL",
          teamId: "ind",
          playerId: "p2",
          playerName: "Sunil Chhetri",
          assistPlayerId: null,
          assistPlayerName: null,
          description: "Chhetri equalizes",
        },
      ],
    });
    const withStar = scoreMoments([match], {
      focusTeamId: "ind",
      starPlayerIds: ["p2"],
      threshold: 0,
    });
    const withoutStar = scoreMoments([match], {
      focusTeamId: "ind",
      threshold: 0,
    });
    const a = withStar.find((m) => m.playerId === "p2")!.importanceScore;
    const b = withoutStar.find((m) => m.playerId === "p2")!.importanceScore;
    expect(a).toBe(b + 8);
  });
});
