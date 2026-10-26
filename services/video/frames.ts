import sharp from "sharp";
import type { RecapContext } from "@/types/domain";
import type { RecapStory } from "@/services/ai/schemas";

// ── Frame renderer ──────────────────────────────────────────
// Every slide is an SVG composed here and rasterized to PNG with
// sharp. All visuals are generated — no copyrighted imagery.
// Team "crest" = colored badge with the FIFA-style short code.

export const W = 1280;
export const H = 720;

const FONT =
  "font-family='Inter, Segoe UI, Arial, sans-serif'";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** naive word-wrap → array of lines */
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else {
      cur += " " + w;
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

function tspans(lines: string[], x: number, y: number, lineH: number, attrs: string): string {
  return lines
    .map((l, i) => `<text x="${x}" y="${y + i * lineH}" ${attrs}>${esc(l)}</text>`)
    .join("");
}

function base(bg1: string, bg2: string): string {
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#shine)"/>
  <circle cx="${W - 120}" cy="90" r="280" fill="#ffffff" opacity="0.03"/>
  <circle cx="80" cy="${H - 60}" r="220" fill="#ffffff" opacity="0.03"/>`;
}

function crest(x: number, y: number, r: number, color: string, code: string): string {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="#ffffff" stroke-opacity="0.35" stroke-width="3"/>
  <text x="${x}" y="${y + r * 0.18}" text-anchor="middle" ${FONT} font-size="${r * 0.52}" font-weight="800" fill="#ffffff">${esc(code)}</text>`;
}

const KICKER = `${FONT} font-size="26" font-weight="700" letter-spacing="6" fill="#94a3b8"`;
const TITLE = `${FONT} font-size="64" font-weight="800" fill="#ffffff"`;
const BODY = `${FONT} font-size="30" font-weight="400" fill="#cbd5e1"`;
const SMALL = `${FONT} font-size="22" font-weight="400" fill="#94a3b8"`;

export interface Slide {
  name: string;
  svg: string;
  duration: number; // seconds
}

export function buildSlides(
  ctx: RecapContext,
  story: RecapStory,
  targetSec: number,
): Slide[] {
  const color = ctx.focusTeam?.primaryColor ?? "#0f172a";
  const teamName = ctx.focusTeam?.name ?? ctx.tournament.name;
  const code = ctx.focusTeam?.shortName ?? "WC";
  const slides: Slide[] = [];

  // INTRO
  slides.push({
    name: "intro",
    duration: 4,
    svg: `${base("#020617", "#1e293b")}
      ${tspans(["WORLD CUP RECAP"], W / 2, 300, 40, `${KICKER} text-anchor="middle"`)}
      ${tspans(wrap(story.title, 24).slice(0, 2), W / 2, 380, 76, `${TITLE} text-anchor="middle"`)}
      ${tspans([ctx.tournament.name], W / 2, 560, 34, `${SMALL} text-anchor="middle"`)}`,
  });

  // TEAM / PLAYER INTRO
  const rec = ctx.focusTeam?.stats;
  slides.push({
    name: "team-intro",
    duration: 5,
    svg: `${base("#020617", color)}
      ${crest(W / 2, 210, 110, color, code)}
      ${tspans(wrap(teamName, 20), W / 2, 400, 80, `${TITLE} text-anchor="middle"`)}
      ${rec ? tspans([`${rec.wins}W · ${rec.draws}D · ${rec.losses}L  —  ${rec.goalsFor} goals for, ${rec.goalsAgainst} against`], W / 2, 500, 40, `${BODY} text-anchor="middle"`) : ""}
      ${ctx.focusPlayer ? tspans([`Starring ${ctx.focusPlayer.name}`], W / 2, 560, 40, `${BODY} text-anchor="middle"`) : ""}`,
  });

  // MATCH CARDS — the journey (up to N most important matches)
  const stageOrder = ["GROUP", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL"];
  const keyMatches = [...ctx.matches]
    .sort((a, b) => stageOrder.indexOf(b.stage) - stageOrder.indexOf(a.stage))
    .slice(0, 5)
    .reverse();
  keyMatches.forEach((m, i) => {
    const score = `${m.homeScore} - ${m.awayScore}`;
    const pens = m.homePenScore != null ? ` (${m.homePenScore}-${m.awayPenScore} pens)` : "";
    const resultColor = m.result === "W" ? "#22c55e" : m.result === "L" ? "#ef4444" : "#eab308";
    const resultText = m.result === "W" ? "VICTORY" : m.result === "L" ? "DEFEAT" : m.result === "D" ? "DRAW" : m.stage.replace(/_/g, " ");
    slides.push({
      name: `match-${i}`,
      duration: 5,
      svg: `${base("#0f172a", "#1e293b")}
        ${tspans([m.stage.replace(/_/g, " ")], W / 2, 130, 34, `${KICKER} text-anchor="middle"`)}
        ${tspans([m.homeTeam], 300, 330, 60, `${TITLE.replace('64', '44')} text-anchor="middle"`)}
        ${tspans([m.awayTeam], W - 300, 330, 60, `${TITLE.replace('64', '44')} text-anchor="middle"`)}
        <rect x="${W / 2 - 160}" y="280" width="320" height="90" rx="14" fill="#000000" opacity="0.45"/>
        ${tspans([score + pens], W / 2, 342, 60, `${FONT} font-size="52" font-weight="800" fill="#ffffff" text-anchor="middle"`)}
        ${m.result ? `<rect x="${W / 2 - 90}" y="410" width="180" height="44" rx="22" fill="${resultColor}" opacity="0.9"/>
        ${tspans([resultText], W / 2, 441, 30, `${FONT} font-size="24" font-weight="700" fill="#0f172a" text-anchor="middle"`)}` : ""}
        ${tspans([m.date.slice(0, 10) + (m.venue ? " · " + m.venue : "")], W / 2, 620, 30, `${SMALL} text-anchor="middle"`)}`,
    });
  });

  // BIGGEST MOMENTS — one card each
  const momentCount = targetSec >= 200 ? 6 : targetSec >= 100 ? 4 : 3;
  ctx.moments.slice(0, momentCount).forEach((mo, i) => {
    const scorePct = mo.importanceScore;
    slides.push({
      name: `moment-${i}`,
      duration: 6,
      svg: `${base("#020617", "#312e81")}
        <rect x="60" y="60" width="150" height="150" rx="18" fill="#f59e0b"/>
        ${tspans([`#${i + 1}`], 135, 155, 60, `${FONT} font-size="52" font-weight="800" fill="#0f172a" text-anchor="middle"`)}
        ${tspans(wrap(mo.title, 34).slice(0, 2), 260, 130, 56, `${FONT} font-size="44" font-weight="800" fill="#ffffff"`)}
        ${tspans(wrap(mo.description, 60).slice(0, 4), 260, 240, 46, BODY)}
        <rect x="60" y="${H - 140}" width="${(W - 120)}" height="14" rx="7" fill="#1e293b"/>
        <rect x="60" y="${H - 140}" width="${((W - 120) * scorePct) / 100}" height="14" rx="7" fill="#f59e0b"/>
        ${tspans([`Importance ${scorePct}/100`], 60, H - 90, 30, SMALL)}`,
    });
  });

  // STATS CARD
  const statItems = rec
    ? [
        ["Matches", String(rec.played)],
        ["Goals", `${rec.goalsFor}–${rec.goalsAgainst}`],
        ["Clean sheets", String(rec.cleanSheets)],
        ["Possession", `${rec.avgPossession}%`],
        ["Top scorer", ctx.topPlayers[0]?.name ?? "—"],
        ["Best rating", ctx.topPlayers[0] ? ctx.topPlayers[0].avgRating.toFixed(1) : "—"],
      ]
    : ctx.topPlayers.slice(0, 6).map((p) => [p.name, `${p.goals}G ${p.assists}A`]);
  slides.push({
    name: "stats",
    duration: 7,
    svg: `${base("#0f172a", "#0c4a6e")}
      ${tspans(["BY THE NUMBERS"], W / 2, 110, 36, `${KICKER} text-anchor="middle"`)}
      ${statItems
        .map(([k, v], i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const x = 200 + col * 440;
          const y = 260 + row * 200;
          return `<rect x="${x - 170}" y="${y - 80}" width="360" height="150" rx="16" fill="#ffffff" opacity="0.06"/>
          ${tspans(wrap(String(v), 16), x, y, 52, `${FONT} font-size="42" font-weight="800" fill="#38bdf8" text-anchor="middle"`)}
          ${tspans([k.toUpperCase()], x, y + 46, 26, `${SMALL} text-anchor="middle"`)}`;
        })
        .join("")}`,
  });

  // VERDICT + OUTRO
  slides.push({
    name: "verdict",
    duration: 7,
    svg: `${base("#020617", color)}
      ${tspans(["THE VERDICT"], W / 2, 140, 36, `${KICKER} text-anchor="middle"`)}
      ${tspans(wrap(story.finalVerdict, 52).slice(0, 5), W / 2, 260, 54, `${FONT} font-size="38" font-weight="600" fill="#ffffff" text-anchor="middle"`)}`,
  });
  slides.push({
    name: "outro",
    duration: 4,
    svg: `${base("#020617", "#1e293b")}
      ${tspans([ctx.tournament.name], W / 2, 300, 50, `${TITLE.replace('64', '46')} text-anchor="middle"`)}
      ${tspans(["Generated by AI World Cup Recap"], W / 2, 380, 34, `${SMALL} text-anchor="middle"`)}
      ${tspans([story.shortSummary], W / 2, 460, 30, `${SMALL} text-anchor="middle"`)}`,
  });

  return slides;
}

export async function renderFrames(slides: Slide[], dir: string): Promise<string[]> {
  const paths: string[] = [];
  for (const [i, s] of slides.entries()) {
    const p = `${dir}/frame-${String(i).padStart(3, "0")}.png`;
    await sharp(Buffer.from(`${s.svg}</svg>`)).png().toFile(p);
    paths.push(p);
  }
  return paths;
}
