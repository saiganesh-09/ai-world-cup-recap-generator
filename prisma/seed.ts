/**
 * Database seed — populates tournaments, teams, players, matches,
 * events and deterministically generated match statistics.
 *
 * Run: npm run db:seed
 */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { wc2022 } from "./data/wc2022";
import { wc2026demo } from "./data/wc2026demo";
import type { SeedTournament, SeedMatch } from "./data/types";

const prisma = new PrismaClient();

// Deterministic PRNG (mulberry32) — same seed → same stats, always.
function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const GOAL_TYPES = new Set(["GOAL", "PENALTY_GOAL", "OWN_GOAL"]);

async function seedTournament(t: SeedTournament) {
  console.log(`  → ${t.name}`);

  const tournament = await prisma.tournament.upsert({
    where: { id: `seed-${t.year}` },
    create: {
      id: `seed-${t.year}`,
      name: t.name,
      year: t.year,
      country: t.country,
      startDate: new Date(t.startDate),
      endDate: new Date(t.endDate),
      isDemo: t.isDemo,
    },
    update: {},
  });

  // Teams + players
  const teamId = new Map<string, string>();
  const playerId = new Map<string, string>(); // `${teamRef}:${name}` → id

  for (const team of t.teams) {
    const id = `seed-${t.year}-${team.ref}`;
    teamId.set(team.ref, id);
    await prisma.team.upsert({
      where: { id },
      create: {
        id,
        name: team.name,
        shortName: team.short,
        country: team.country,
        flagEmoji: team.flag,
        primaryColor: team.color,
      },
      update: {},
    });
    await prisma.tournamentTeam.upsert({
      where: { tournamentId_teamId: { tournamentId: tournament.id, teamId: id } },
      create: { tournamentId: tournament.id, teamId: id, group: team.group },
      update: {},
    });

    for (const p of team.players) {
      const pid = `${id}-p${p.no}`;
      playerId.set(`${team.ref}:${p.name}`, pid);
      await prisma.player.upsert({
        where: { id: pid },
        create: {
          id: pid,
          name: p.name,
          teamId: id,
          position: p.pos,
          jerseyNumber: p.no,
          age: p.age,
        },
        update: {},
      });
    }
  }

  // Matches + events + stats
  for (const [i, m] of t.matches.entries()) {
    const mid = `seed-${t.year}-m${i}`;
    const home = teamId.get(m.home)!;
    const away = teamId.get(m.away)!;

    await prisma.match.upsert({
      where: { id: mid },
      create: {
        id: mid,
        tournamentId: tournament.id,
        homeTeamId: home,
        awayTeamId: away,
        date: new Date(m.date),
        venue: m.venue,
        stage: m.stage,
        groupName: m.group,
        status: "FINISHED",
        homeScore: m.h,
        awayScore: m.a,
        homePenScore: m.hp,
        awayPenScore: m.ap,
      },
      update: {},
    });

    // Events
    await prisma.matchEvent.deleteMany({ where: { matchId: mid } });
    for (const e of m.events ?? []) {
      const pid = e.player ? playerId.get(`${e.team}:${e.player}`) : undefined;
      await prisma.matchEvent.create({
        data: {
          matchId: mid,
          type: e.type,
          minute: e.min,
          extraMinute: e.extraMinute,
          detail: e.detail,
          description: e.description,
          teamId: teamId.get(e.team),
          playerId: pid ?? null,
        },
      });
    }

    await seedMatchStats(t, m, mid, teamId);
  }
}

async function seedMatchStats(
  t: SeedTournament,
  m: SeedMatch,
  matchId: string,
  teamId: Map<string, string>,
) {
  const rand = rng(hashStr(matchId));

  // Team-level stats, loosely correlated with the result.
  for (const [ref, goals] of [
    [m.home, m.h],
    [m.away, m.a],
  ] as const) {
    const dominant = goals >= (ref === m.home ? m.a : m.h);
    await prisma.teamMatchStat.upsert({
      where: { teamId_matchId: { teamId: teamId.get(ref)!, matchId } },
      create: {
        teamId: teamId.get(ref)!,
        matchId,
        possession: Math.round((dominant ? 48 + rand() * 18 : 32 + rand() * 18) * 10) / 10,
        shots: goals * 2 + Math.floor(rand() * 9) + 2,
        shotsOnTarget: goals + Math.floor(rand() * 4),
        corners: Math.floor(rand() * 9),
        fouls: 6 + Math.floor(rand() * 10),
      },
      update: {},
    });
  }

  // Player-level stats for squads that exist in the seed.
  for (const ref of [m.home, m.away]) {
    const team = t.teams.find((x) => x.ref === ref);
    if (!team?.players.length) continue;
    const oppGoals = ref === m.home ? m.a : m.h;
    const won =
      (ref === m.home && m.h > m.a) || (ref === m.away && m.a > m.h);
    const lost =
      (ref === m.home && m.h < m.a) || (ref === m.away && m.a < m.h);

    // Goal/assist attribution from events for this team.
    const scorerGoals = new Map<string, number>();
    for (const e of m.events ?? []) {
      if (e.team === ref && GOAL_TYPES.has(e.type) && e.player) {
        scorerGoals.set(e.player, (scorerGoals.get(e.player) ?? 0) + 1);
      }
    }

    for (const p of team.players) {
      const prand = rng(hashStr(`${matchId}:${p.name}`));
      const minutes =
        p.pos === "GK" ? 90 : Math.round(55 + prand() * 35);
      const goals = scorerGoals.get(p.name) ?? 0;
      const assists =
        prand() < (p.pos === "FW" ? 0.14 : p.pos === "MF" ? 0.12 : 0.05)
          ? 1
          : 0;
      const shots =
        p.pos === "FW"
          ? Math.floor(prand() * 5) + goals
          : p.pos === "MF"
            ? Math.floor(prand() * 3)
            : Math.floor(prand() * 1.4);
      const passes =
        p.pos === "GK"
          ? Math.floor(12 + prand() * 18)
          : p.pos === "DF"
            ? Math.floor(35 + prand() * 40)
            : Math.floor(40 + prand() * 50);
      const tackles =
        p.pos === "DF" || p.pos === "MF"
          ? Math.floor(prand() * 5)
          : Math.floor(prand() * 2);
      const rating = Math.round(
        Math.min(
          10,
          Math.max(
            4.5,
            6.4 +
              goals * 0.9 +
              assists * 0.5 +
              (won ? 0.4 : 0) -
              (lost ? 0.3 : 0) -
              oppGoals * 0.08 +
              (prand() - 0.5) * 1.2,
          ),
        ) * 10,
      ) / 10;

      const pid = `${teamId.get(ref)}-p${p.no}`;
      await prisma.playerMatchStat.upsert({
        where: { playerId_matchId: { playerId: pid, matchId } },
        create: {
          playerId: pid,
          matchId,
          minutes,
          goals,
          assists,
          shots,
          passes,
          tackles,
          rating,
        },
        update: {},
      });
    }
  }
}

async function seedUsers() {
  const demoHash = await bcrypt.hash("demo1234", 10);
  const demo = await prisma.user.upsert({
    where: { email: "demo@worldcup.ai" },
    create: {
      email: "demo@worldcup.ai",
      name: "Demo Fan",
      passwordHash: demoHash,
    },
    update: {},
  });
  console.log(`  → demo user: demo@worldcup.ai / demo1234`);
  return demo;
}

/** Pre-built recap so recruiters see the finished product instantly. */
async function seedDemoRecap(userId: string) {
  const recapId = "seed-demo-recap-arg";
  const story = {
    title: "Argentina's World Cup Journey",
    shortSummary:
      "From the shock of Saudi Arabia to the greatest final ever played — how Messi and Argentina conquered Qatar 2022.",
    tournamentStory:
      "Argentina arrived in Qatar on a 36-match unbeaten run — and lost their opener to Saudi Arabia in one of the biggest upsets in World Cup history. What followed was a masterclass in resilience. Messi dragged his side past Mexico and Poland, demolished Australia in his 1000th career match, survived a 101st-minute Dutch equalizer on penalties, and outclassed Croatia in the semi. The final against France became an instant classic: Argentina led 2-0 and 3-2, Mbappé scored a hat-trick, and only Emiliano Martínez's last-second miracle save forced a shootout — which Argentina won 4-2.",
    biggestMoments: [
      "Messi's extra-time goal in the final (108')",
      "Martínez's miracle save on Kolo Muani (120+3')",
      "The 2-0 comeback win over Mexico that saved the campaign",
      "Surviving the Netherlands' 101st-minute equalizer",
      "Álvarez's solo run for 2-0 vs Croatia",
    ],
    keyPlayers: [
      { name: "Lionel Messi", note: "7 goals, Golden Ball — completed football" },
      { name: "Julián Álvarez", note: "4 goals, relentless pressing" },
      { name: "Emiliano Martínez", note: "Golden Glove; two shootout heroics" },
      { name: "Enzo Fernández", note: "Young Player of the Tournament" },
    ],
    turningPoints: [
      "The Saudi Arabia defeat that forced tactical reinvention",
      "Scaloni trusting Álvarez and Enzo Fernández over established stars",
      "Martínez's double save in the Netherlands shootout",
    ],
    statisticsHighlights: [
      "Messi: 7 goals, 3 assists — involved in 10 of Argentina's 15 goals",
      "Argentina won all 3 knockout games decided after 90' in regular or extra time",
      "Conceded first in only 1 of 7 matches after the opener",
    ],
    finalVerdict:
      "A triumph of resilience and reinvention — the crowning chapter of Messi's career and arguably the greatest World Cup story ever told.",
  };

  await prisma.recapMoment.deleteMany({ where: { recapId } });
  await prisma.recap.upsert({
    where: { id: recapId },
    create: {
      id: recapId,
      userId,
      tournamentId: "seed-2022",
      teamId: "seed-2022-ARG",
      type: "TEAM_JOURNEY",
      tone: "EXCITING",
      length: "STANDARD",
      title: story.title,
      summary: story.shortSummary,
      story: story as unknown as Prisma.InputJsonValue,
      status: "READY",
      durationSec: 120,
    },
    update: {},
  });
  console.log("  → demo recap (Argentina 2022)");
}

async function main() {
  console.log("Seeding database…");
  const user = await seedUsers();
  await seedTournament(wc2022);
  await seedTournament(wc2026demo);
  await seedDemoRecap(user.id);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
