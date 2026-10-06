/**
 * Demo dataset seed — FIFA World Cup 2026 (Demo Edition).
 *
 * A complete, clearly-labeled fictional tournament: 8 teams, ~64 players,
 * 16 matches with events and statistics, plus a demo user and a
 * pre-built showcase recap so the product is demoable in under a minute.
 *
 * Usage: npm run db:seed        (idempotent — wipes and rebuilds demo data)
 */
import { PrismaClient, type Position, type MatchStage } from "@prisma/client";
import bcrypt from "bcryptjs";

process.loadEnvFile?.(".env");
const prisma = new PrismaClient();

// Deterministic RNG so repeated seeds produce identical datasets.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(2026);
const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];

// ─── Teams ───────────────────────────────────────────────────────────

const TEAMS = [
  { name: "India", shortName: "IND", country: "India", flag: "🇮🇳", primaryColor: "#f97316", accentColor: "#1e3a8a", fifaRanking: 121 },
  { name: "Brazil", shortName: "BRA", country: "Brazil", flag: "🇧🇷", primaryColor: "#facc15", accentColor: "#166534", fifaRanking: 5 },
  { name: "Argentina", shortName: "ARG", country: "Argentina", flag: "🇦🇷", primaryColor: "#7dd3fc", accentColor: "#1e3a8a", fifaRanking: 1 },
  { name: "France", shortName: "FRA", country: "France", flag: "🇫🇷", primaryColor: "#1d4ed8", accentColor: "#dc2626", fifaRanking: 2 },
  { name: "England", shortName: "ENG", country: "England", flag: "🏴", primaryColor: "#e2e8f0", accentColor: "#dc2626", fifaRanking: 4 },
  { name: "Japan", shortName: "JPN", country: "Japan", flag: "🇯🇵", primaryColor: "#1e40af", accentColor: "#dc2626", fifaRanking: 15 },
  { name: "Morocco", shortName: "MAR", country: "Morocco", flag: "🇲🇦", primaryColor: "#b91c1c", accentColor: "#166534", fifaRanking: 12 },
  { name: "USA", shortName: "USA", country: "United States", flag: "🇺🇸", primaryColor: "#1e3a8a", accentColor: "#dc2626", fifaRanking: 14 },
] as const;

type TeamName = (typeof TEAMS)[number]["name"];

// ─── Players ─────────────────────────────────────────────────────────

const PLAYERS: Record<TeamName, { name: string; pos: Position; num: number; star?: boolean; age?: number }[]> = {
  India: [
    { name: "Sunil Chhetri", pos: "FW", num: 11, star: true, age: 41 },
    { name: "Lallianzuala Chhangte", pos: "FW", num: 17, star: true, age: 29 },
    { name: "Manvir Singh", pos: "FW", num: 9, age: 30 },
    { name: "Sahal Abdul Samad", pos: "MF", num: 18, age: 29 },
    { name: "Anirudh Thapa", pos: "MF", num: 7, age: 28 },
    { name: "Sandesh Jhingan", pos: "DF", num: 5, age: 32 },
    { name: "Akash Mishra", pos: "DF", num: 3, age: 24 },
    { name: "Gurpreet Singh Sandhu", pos: "GK", num: 1, age: 34 },
  ],
  Brazil: [
    { name: "Vinícius Júnior", pos: "FW", num: 7, star: true, age: 25 },
    { name: "Rodrygo", pos: "FW", num: 10, star: true, age: 25 },
    { name: "Endrick", pos: "FW", num: 9, age: 19 },
    { name: "Casemiro", pos: "MF", num: 5, age: 34 },
    { name: "Bruno Guimarães", pos: "MF", num: 8, age: 28 },
    { name: "Marquinhos", pos: "DF", num: 4, age: 32 },
    { name: "Éder Militão", pos: "DF", num: 3, age: 28 },
    { name: "Alisson Becker", pos: "GK", num: 1, age: 33 },
  ],
  Argentina: [
    { name: "Lionel Messi", pos: "FW", num: 10, star: true, age: 38 },
    { name: "Julián Álvarez", pos: "FW", num: 9, star: true, age: 26 },
    { name: "Lautaro Martínez", pos: "FW", num: 22, age: 28 },
    { name: "Enzo Fernández", pos: "MF", num: 24, age: 25 },
    { name: "Alexis Mac Allister", pos: "MF", num: 20, age: 27 },
    { name: "Rodrigo De Paul", pos: "MF", num: 7, age: 32 },
    { name: "Cristian Romero", pos: "DF", num: 13, age: 28 },
    { name: "Emiliano Martínez", pos: "GK", num: 23, age: 33 },
  ],
  France: [
    { name: "Kylian Mbappé", pos: "FW", num: 10, star: true, age: 27 },
    { name: "Antoine Griezmann", pos: "FW", num: 7, star: true, age: 35 },
    { name: "Ousmane Dembélé", pos: "FW", num: 11, age: 29 },
    { name: "Aurélien Tchouaméni", pos: "MF", num: 8, age: 26 },
    { name: "Eduardo Camavinga", pos: "MF", num: 6, age: 23 },
    { name: "William Saliba", pos: "DF", num: 17, age: 25 },
    { name: "Theo Hernández", pos: "DF", num: 22, age: 28 },
    { name: "Mike Maignan", pos: "GK", num: 16, age: 30 },
  ],
  England: [
    { name: "Harry Kane", pos: "FW", num: 9, star: true, age: 32 },
    { name: "Jude Bellingham", pos: "MF", num: 10, star: true, age: 22 },
    { name: "Bukayo Saka", pos: "FW", num: 7, age: 24 },
    { name: "Phil Foden", pos: "MF", num: 11, age: 26 },
    { name: "Declan Rice", pos: "MF", num: 4, age: 27 },
    { name: "John Stones", pos: "DF", num: 5, age: 32 },
    { name: "Kyle Walker", pos: "DF", num: 2, age: 36 },
    { name: "Jordan Pickford", pos: "GK", num: 1, age: 32 },
  ],
  Japan: [
    { name: "Kaoru Mitoma", pos: "FW", num: 7, star: true, age: 29 },
    { name: "Takefusa Kubo", pos: "MF", num: 20, star: true, age: 25 },
    { name: "Wataru Endo", pos: "MF", num: 6, age: 33 },
    { name: "Daichi Kamada", pos: "MF", num: 8, age: 29 },
    { name: "Hidemasa Morita", pos: "MF", num: 5, age: 31 },
    { name: "Takehiro Tomiyasu", pos: "DF", num: 4, age: 27 },
    { name: "Ko Itakura", pos: "DF", num: 3, age: 29 },
    { name: "Zion Suzuki", pos: "GK", num: 1, age: 23 },
  ],
  Morocco: [
    { name: "Achraf Hakimi", pos: "DF", num: 2, star: true, age: 27 },
    { name: "Hakim Ziyech", pos: "MF", num: 7, star: true, age: 33 },
    { name: "Youssef En-Nesyri", pos: "FW", num: 19, age: 29 },
    { name: "Sofyan Amrabat", pos: "MF", num: 4, age: 29 },
    { name: "Brahim Díaz", pos: "MF", num: 10, age: 26 },
    { name: "Noussair Mazraoui", pos: "DF", num: 3, age: 28 },
    { name: "Nayef Aguerd", pos: "DF", num: 5, age: 30 },
    { name: "Yassine Bounou", pos: "GK", num: 1, age: 35 },
  ],
  USA: [
    { name: "Christian Pulisic", pos: "FW", num: 10, star: true, age: 27 },
    { name: "Gio Reyna", pos: "MF", num: 7, star: true, age: 23 },
    { name: "Weston McKennie", pos: "MF", num: 8, age: 27 },
    { name: "Timothy Weah", pos: "FW", num: 21, age: 26 },
    { name: "Folarin Balogun", pos: "FW", num: 20, age: 24 },
    { name: "Tyler Adams", pos: "MF", num: 4, age: 27 },
    { name: "Antonee Robinson", pos: "DF", num: 5, age: 28 },
    { name: "Matt Turner", pos: "GK", num: 1, age: 32 },
  ],
};

// ─── Matches ─────────────────────────────────────────────────────────

interface SeedEvent {
  minute: number;
  type: "GOAL" | "PENALTY_GOAL" | "PENALTY_MISS" | "OWN_GOAL" | "YELLOW_CARD" | "RED_CARD";
  team: TeamName;
  player?: string;
  assist?: string;
}

interface SeedMatch {
  date: string;
  venue: string;
  stage: MatchStage;
  home: TeamName;
  away: TeamName;
  homeScore: number;
  awayScore: number;
  homePens?: number;
  awayPens?: number;
  events?: SeedEvent[]; // when omitted, auto-generated from the scoreline
}

const MATCHES: SeedMatch[] = [
  // ── Group A ──
  {
    date: "2026-06-11", venue: "SoFi Stadium, Los Angeles", stage: "GROUP",
    home: "India", away: "Japan", homeScore: 2, awayScore: 1,
    events: [
      { minute: 34, type: "GOAL", team: "India", player: "Lallianzuala Chhangte", assist: "Sunil Chhetri" },
      { minute: 61, type: "GOAL", team: "Japan", player: "Kaoru Mitoma" },
      { minute: 89, type: "GOAL", team: "India", player: "Sunil Chhetri", assist: "Sahal Abdul Samad" },
      { minute: 71, type: "YELLOW_CARD", team: "India", player: "Sandesh Jhingan" },
    ],
  },
  { date: "2026-06-11", venue: "MetLife Stadium, New York", stage: "GROUP", home: "Brazil", away: "Morocco", homeScore: 3, awayScore: 1 },
  { date: "2026-06-16", venue: "AT&T Stadium, Dallas", stage: "GROUP", home: "Japan", away: "Brazil", homeScore: 0, awayScore: 4 },
  {
    date: "2026-06-16", venue: "Lumen Field, Seattle", stage: "GROUP",
    home: "India", away: "Morocco", homeScore: 1, awayScore: 1,
    events: [
      { minute: 52, type: "GOAL", team: "Morocco", player: "Youssef En-Nesyri" },
      { minute: 78, type: "GOAL", team: "India", player: "Manvir Singh", assist: "Lallianzuala Chhangte" },
      { minute: 85, type: "RED_CARD", team: "Morocco", player: "Sofyan Amrabat" },
    ],
  },
  {
    date: "2026-06-21", venue: "NRG Stadium, Houston", stage: "GROUP",
    home: "Brazil", away: "India", homeScore: 2, awayScore: 0,
    events: [
      { minute: 23, type: "GOAL", team: "Brazil", player: "Vinícius Júnior", assist: "Rodrygo" },
      { minute: 67, type: "GOAL", team: "Brazil", player: "Rodrygo" },
      { minute: 40, type: "YELLOW_CARD", team: "India", player: "Anirudh Thapa" },
    ],
  },
  { date: "2026-06-21", venue: "BC Place, Vancouver", stage: "GROUP", home: "Morocco", away: "Japan", homeScore: 2, awayScore: 2 },
  // ── Group B ──
  { date: "2026-06-12", venue: "Hard Rock Stadium, Miami", stage: "GROUP", home: "Argentina", away: "USA", homeScore: 2, awayScore: 0 },
  { date: "2026-06-12", venue: "Mercedes-Benz Stadium, Atlanta", stage: "GROUP", home: "France", away: "England", homeScore: 1, awayScore: 1 },
  { date: "2026-06-17", venue: "SoFi Stadium, Los Angeles", stage: "GROUP", home: "England", away: "Argentina", homeScore: 2, awayScore: 1 },
  { date: "2026-06-17", venue: "MetLife Stadium, New York", stage: "GROUP", home: "France", away: "USA", homeScore: 3, awayScore: 0 },
  {
    date: "2026-06-22", venue: "AT&T Stadium, Dallas", stage: "GROUP",
    home: "Argentina", away: "France", homeScore: 3, awayScore: 1,
    events: [
      { minute: 18, type: "GOAL", team: "Argentina", player: "Julián Álvarez" },
      { minute: 35, type: "GOAL", team: "France", player: "Kylian Mbappé" },
      { minute: 66, type: "GOAL", team: "Argentina", player: "Lionel Messi", assist: "Enzo Fernández" },
      { minute: 88, type: "GOAL", team: "Argentina", player: "Lautaro Martínez" },
      { minute: 70, type: "RED_CARD", team: "France", player: "William Saliba" },
    ],
  },
  { date: "2026-06-22", venue: "Lumen Field, Seattle", stage: "GROUP", home: "USA", away: "England", homeScore: 0, awayScore: 2 },
  // ── Semi-finals ──
  {
    date: "2026-06-29", venue: "SoFi Stadium, Los Angeles", stage: "SEMI_FINAL",
    home: "Brazil", away: "Argentina", homeScore: 1, awayScore: 1, homePens: 4, awayPens: 2,
    events: [
      { minute: 31, type: "GOAL", team: "Brazil", player: "Vinícius Júnior" },
      { minute: 74, type: "GOAL", team: "Argentina", player: "Lionel Messi" },
      { minute: 58, type: "YELLOW_CARD", team: "Brazil", player: "Casemiro" },
      { minute: 82, type: "YELLOW_CARD", team: "Argentina", player: "Cristian Romero" },
    ],
  },
  {
    date: "2026-06-30", venue: "MetLife Stadium, New York", stage: "SEMI_FINAL",
    home: "India", away: "England", homeScore: 0, awayScore: 3,
    events: [
      { minute: 18, type: "GOAL", team: "England", player: "Harry Kane" },
      { minute: 44, type: "GOAL", team: "England", player: "Jude Bellingham", assist: "Bukayo Saka" },
      { minute: 71, type: "GOAL", team: "England", player: "Bukayo Saka" },
    ],
  },
  // ── Third place ──
  {
    date: "2026-07-04", venue: "Hard Rock Stadium, Miami", stage: "THIRD_PLACE",
    home: "India", away: "Argentina", homeScore: 2, awayScore: 1,
    events: [
      { minute: 30, type: "GOAL", team: "Argentina", player: "Lionel Messi", assist: "Alexis Mac Allister" },
      { minute: 55, type: "GOAL", team: "India", player: "Sunil Chhetri" },
      { minute: 87, type: "GOAL", team: "India", player: "Lallianzuala Chhangte", assist: "Sahal Abdul Samad" },
      { minute: 90, type: "YELLOW_CARD", team: "India", player: "Gurpreet Singh Sandhu" },
    ],
  },
  // ── Final ──
  {
    date: "2026-07-05", venue: "MetLife Stadium, New York", stage: "FINAL",
    home: "Brazil", away: "England", homeScore: 2, awayScore: 1,
    events: [
      { minute: 25, type: "GOAL", team: "Brazil", player: "Vinícius Júnior" },
      { minute: 58, type: "PENALTY_GOAL", team: "England", player: "Harry Kane" },
      { minute: 82, type: "GOAL", team: "Brazil", player: "Rodrygo", assist: "Endrick" },
      { minute: 77, type: "YELLOW_CARD", team: "England", player: "Kyle Walker" },
    ],
  },
];

// Auto-generate plausible goal events for matches without curated ones.
function autoEvents(match: SeedMatch): SeedEvent[] {
  const events: SeedEvent[] = [];
  const makeGoals = (team: TeamName, count: number, usedMinutes: Set<number>) => {
    const roster = PLAYERS[team].filter((p) => p.pos !== "GK");
    const scorers = [...roster].sort((a, b) =>
      (b.star ? 1 : 0) + (b.pos === "FW" ? 0.8 : b.pos === "MF" ? 0.3 : 0) -
      ((a.star ? 1 : 0) + (a.pos === "FW" ? 0.8 : a.pos === "MF" ? 0.3 : 0)),
    );
    for (let i = 0; i < count; i++) {
      let minute = 5 + Math.floor(rng() * 85);
      while (usedMinutes.has(minute)) minute = (minute + 1) % 91;
      usedMinutes.add(minute);
      const scorer = scorers[i % scorers.length];
      const assist = rng() > 0.4 ? pick(roster.filter((p) => p.name !== scorer.name)) : undefined;
      events.push({
        minute,
        type: "GOAL",
        team,
        player: scorer.name,
        ...(assist ? { assist: assist.name } : {}),
      });
    }
  };
  const used = new Set<number>();
  makeGoals(match.home, match.homeScore, used);
  makeGoals(match.away, match.awayScore, used);
  if (rng() > 0.5) {
    const team = pick([match.home, match.away]);
    events.push({
      minute: 20 + Math.floor(rng() * 60),
      type: "YELLOW_CARD",
      team,
      player: pick(PLAYERS[team].filter((p) => p.pos === "DF" || p.pos === "MF")).name,
    });
  }
  return events.sort((a, b) => a.minute - b.minute);
}

// ─── Seed ────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding demo dataset...");

  // Wipe domain data (idempotent reseed)
  await prisma.$transaction([
    prisma.analyticsEvent.deleteMany(),
    prisma.recapMoment.deleteMany(),
    prisma.generationJob.deleteMany(),
    prisma.recap.deleteMany(),
    prisma.transcript.deleteMany(),
    prisma.matchEvent.deleteMany(),
    prisma.playerMatchStat.deleteMany(),
    prisma.teamMatchStat.deleteMany(),
    prisma.match.deleteMany(),
    prisma.player.deleteMany(),
    prisma.team.deleteMany(),
    prisma.tournament.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const tournament = await prisma.tournament.create({
    data: {
      name: "FIFA World Cup 2026",
      year: 2026,
      hostCountry: "USA · Canada · Mexico",
      startDate: new Date("2026-06-11"),
      endDate: new Date("2026-07-05"),
      status: "COMPLETED",
      isDemo: true,
    },
  });

  const teamIds = new Map<TeamName, string>();
  for (const t of TEAMS) {
    const team = await prisma.team.create({ data: { ...t } });
    teamIds.set(t.name, team.id);
    for (const p of PLAYERS[t.name]) {
      await prisma.player.create({
        data: {
          name: p.name,
          teamId: team.id,
          position: p.pos,
          jerseyNumber: p.num,
          isStar: p.star ?? false,
          age: p.age ?? null,
        },
      });
    }
  }

  const playersByName = new Map(
    (await prisma.player.findMany({ include: { team: true } })).map((p) => [
      `${p.team.name}:${p.name}`,
      p,
    ]),
  );

  for (const m of MATCHES) {
    const events = m.events ?? autoEvents(m);
    const match = await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        homeTeamId: teamIds.get(m.home)!,
        awayTeamId: teamIds.get(m.away)!,
        date: new Date(m.date),
        venue: m.venue,
        stage: m.stage,
        status: "FINISHED",
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        homePenalties: m.homePens ?? null,
        awayPenalties: m.awayPens ?? null,
      },
    });

    for (const e of events) {
      const player = e.player
        ? playersByName.get(`${e.team}:${e.player}`)
        : undefined;
      const assist = e.assist
        ? playersByName.get(`${e.team}:${e.assist}`)
        : undefined;
      await prisma.matchEvent.create({
        data: {
          matchId: match.id,
          minute: e.minute,
          type: e.type,
          teamId: teamIds.get(e.team),
          playerId: player?.id ?? null,
          assistPlayerId: assist?.id ?? null,
          description: describe(e),
        },
      });
    }

    // Team stats — deterministic-ish, correlated with result
    const homePoss = Math.round(45 + rng() * 10 + (m.homeScore - m.awayScore) * 2);
    for (const [teamId, goals, poss] of [
      [teamIds.get(m.home)!, m.homeScore, Math.min(70, Math.max(30, homePoss))],
      [teamIds.get(m.away)!, m.awayScore, 0],
    ] as const) {
      const shots = 5 + goals * 2 + Math.floor(rng() * 7);
      await prisma.teamMatchStat.create({
        data: {
          teamId,
          matchId: match.id,
          possession: poss === 0 ? 100 - Math.min(70, Math.max(30, homePoss)) : poss,
          shots,
          shotsOnTarget: Math.min(shots, goals + Math.floor(rng() * 4)),
          corners: 2 + Math.floor(rng() * 8),
          fouls: 6 + Math.floor(rng() * 9),
        },
      });
    }

    // Player stats for the squad of each side
    for (const teamName of [m.home, m.away]) {
      const teamEvents = events.filter((e) => e.team === teamName);
      for (const p of PLAYERS[teamName]) {
        const pid = playersByName.get(`${teamName}:${p.name}`)!.id;
        const goals = teamEvents.filter(
          (e) => (e.type === "GOAL" || e.type === "PENALTY_GOAL") && e.player === p.name,
        ).length;
        const assists = teamEvents.filter((e) => e.assist === p.name).length;
        const rating = Math.min(
          10,
          Math.max(
            5.5,
            6.4 + goals * 1.2 + assists * 0.6 + (rng() - 0.4) * 1.4,
          ),
        );
        await prisma.playerMatchStat.create({
          data: {
            playerId: pid,
            matchId: match.id,
            minutes: p.pos === "GK" ? 90 : 62 + Math.floor(rng() * 28),
            goals,
            assists,
            shots: goals + Math.floor(rng() * (p.pos === "FW" ? 4 : 2)),
            shotsOnTarget: Math.max(goals, Math.floor(rng() * 2)),
            passes: p.pos === "MF" ? 40 + Math.floor(rng() * 40) : 15 + Math.floor(rng() * 30),
            tackles: p.pos === "DF" ? 1 + Math.floor(rng() * 4) : Math.floor(rng() * 2),
            rating: Math.round(rating * 10) / 10,
          },
        });
      }
    }
  }

  // Demo account — instant login for evaluators
  const demoUser = await prisma.user.create({
    data: {
      email: "demo@worldcup.app",
      name: "Demo Fan",
      passwordHash: await bcrypt.hash("demo1234", 12),
      role: "ADMIN",
    },
  });

  // ── Showcase recap: India's run, pre-generated so the product is
  // demoable instantly. Video render is best-effort — the story lands
  // either way and the video can regenerate from the UI.
  try {
    const { buildRecapContext } = await import(
      "../services/recap/context-builder"
    );
    const { scoreMoments } = await import(
      "../services/moments/importance-scorer"
    );
    const { generateRecapNarrative } = await import(
      "../services/ai/recap-generator"
    );
    const { renderRecapVideo } = await import(
      "../services/video/video-service"
    );

    const indiaId = teamIds.get("India")!;
    const prefs = {
      type: "TEAM_JOURNEY" as const,
      tone: "EXCITING" as const,
      duration: "STANDARD" as const,
    };
    const ctx = await buildRecapContext({
      tournamentId: tournament.id,
      teamId: indiaId,
      prefs,
    });
    const starIds = ctx.playerStats
      .filter((p) => p.player.isStar)
      .map((p) => p.player.id);
    const moments = scoreMoments(ctx.matches, {
      focusTeamId: indiaId,
      starPlayerIds: starIds,
      limit: 8,
    });
    const { output: story } = await generateRecapNarrative(ctx, prefs, moments);

    const recap = await prisma.recap.create({
      data: {
        userId: demoUser.id,
        tournamentId: tournament.id,
        teamId: indiaId,
        type: prefs.type,
        tone: prefs.tone,
        duration: prefs.duration,
        title: story.title,
        summary: story.shortSummary,
        story: story as object,
        status: "COMPLETED",
        isPublic: true,
      },
    });
    await prisma.recapMoment.createMany({
      data: moments.slice(0, 6).map((m, i) => ({
        recapId: recap.id,
        matchId: m.matchId,
        playerId: m.playerId,
        minute: m.minute,
        title: m.title,
        description: m.description,
        importanceScore: m.importanceScore,
        order: i,
      })),
    });

    try {
      console.log("Rendering showcase video (best effort)...");
      const rendered = await renderRecapVideo(recap.id, ctx, prefs, story, moments);
      await prisma.recap.update({
        where: { id: recap.id },
        data: {
          videoUrl: rendered.videoUrl,
          thumbnailUrl: rendered.thumbnailUrl,
          durationSec: rendered.durationSec,
        },
      });
      console.log(`Showcase video ready (${rendered.durationSec}s).`);
    } catch (err) {
      console.warn(
        "Video render skipped — recap seeded without video:",
        err instanceof Error ? err.message : err,
      );
    }
    console.log(`Showcase recap: /share/${recap.shareId}`);
  } catch (err) {
    console.warn("Showcase recap skipped:", err);
  }

  console.log(`Seeded: 1 tournament, ${TEAMS.length} teams, ${TEAMS.length * 8} players, ${MATCHES.length} matches.`);
  console.log(`Demo login: demo@worldcup.app / demo1234 (user ${demoUser.id})`);
}

function describe(e: SeedEvent): string {
  const who = e.player ?? "Unknown player";
  const assistTxt = e.assist ? ` (assist: ${e.assist})` : "";
  switch (e.type) {
    case "GOAL":
      return `${who} scores for ${e.team}${assistTxt}`;
    case "PENALTY_GOAL":
      return `${who} scores a penalty for ${e.team}`;
    case "PENALTY_MISS":
      return `${who} misses a penalty for ${e.team}`;
    case "OWN_GOAL":
      return `Own goal by ${who} (${e.team})`;
    case "YELLOW_CARD":
      return `${who} is shown a yellow card`;
    case "RED_CARD":
      return `${who} is sent off — straight red`;
    default:
      return `${who} — ${e.type}`;
  }
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
