import sharp from "sharp";
import type { VideoSlide } from "@/types";

const W = 1280;
const H = 720;

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function wrap(text: string, maxChars: number, maxLines = 3): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) {
      if (line) lines.push(line.trim());
      line = w;
      if (lines.length === maxLines - 1) break;
    } else {
      line += " " + w;
    }
  }
  const remaining = words.join(" ");
  if (line.trim()) lines.push(line.trim());
  if (lines.length === maxLines && lines[maxLines - 1] !== remaining) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, "") + "…";
  }
  return lines;
}

function tspans(
  lines: string[],
  x: number,
  y: number,
  size: number,
  fill: string,
  lineHeight = 1.3,
  weight = 400,
  anchor = "middle",
  spacing?: number,
): string {
  return lines
    .map(
      (l, i) =>
        `<text x="${x}" y="${y + i * size * lineHeight}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}"${spacing ? ` letter-spacing="${spacing}"` : ""} font-family="Segoe UI, Arial, Helvetica, sans-serif">${esc(l)}</text>`,
    )
    .join("\n");
}

/** Shared chrome: dark cinematic canvas + accent glow + frame. */
function chrome(accent: string, inner: string): string {
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#070b16"/>
      <stop offset="0.55" stop-color="#0b1224"/>
      <stop offset="1" stop-color="#101a33"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.35" r="0.75">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0" y="0" width="${W}" height="4" fill="${accent}"/>
  <rect x="0" y="${H - 4}" width="${W}" height="4" fill="${accent}" opacity="0.4"/>
  <rect x="36" y="36" width="${W - 72}" height="${H - 72}" fill="none" stroke="#ffffff" stroke-opacity="0.07" rx="16"/>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>
  <text x="640" y="692" font-size="15" fill="#94a3b8" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" letter-spacing="3">AI WORLD CUP RECAP GENERATOR</text>
  ${inner}
</svg>`;
}

function kicker(text: string, y: number, accent: string): string {
  return `<text x="640" y="${y}" font-size="19" fill="${accent}" font-weight="700" text-anchor="middle" letter-spacing="6" font-family="Segoe UI, Arial, sans-serif">${esc(text.toUpperCase())}</text>`;
}

function crest(shortName: string, accent: string, cx: number, cy: number, r: number): string {
  return `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${accent}" fill-opacity="0.15" stroke="${accent}" stroke-width="3"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 10}" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1"/>
  <text x="${cx}" y="${cy + 14}" font-size="44" fill="#fff" font-weight="800" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" letter-spacing="2">${esc(shortName)}</text>`;
}

function renderSlide(slide: VideoSlide): string {
  const accent = slide.accent ?? "#f59e0b";
  const cx = 640;

  switch (slide.kind) {
    case "intro": {
      return chrome(
        accent,
        `
        ${kicker("official recap", 240, accent)}
        ${tspans(wrap(slide.title, 30, 2), cx, 330, 62, "#ffffff", 1.15, 800)}
        ${slide.subtitle ? tspans(wrap(slide.subtitle, 55, 2), cx, 470, 24, "#94a3b8") : ""}
        <rect x="540" y="540" width="200" height="3" fill="${accent}"/>
      `,
      );
    }
    case "subject": {
      const code =
        slide.code ??
        slide.title
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 3)
          .toUpperCase();
      return chrome(
        accent,
        `
        ${kicker("the subject", 128, accent)}
        ${crest(code, accent, cx, 260, 90)}
        ${tspans(wrap(slide.title, 24, 2), cx, 420, 52, "#ffffff", 1.15, 800)}
        ${slide.subtitle ? tspans(wrap(slide.subtitle, 50, 2), cx, 480, 22, accent, 1.35, 600) : ""}
        ${(slide.body ?? [])
          .map((b, i) => tspans(wrap(b, 55, 1), cx, 560 + i * 34, 21, "#cbd5e1"))
          .join("\n")}
      `,
      );
    }
    case "match": {
      const m = slide.match!;
      const home = m.home.replace(/\s*\([A-Z]{3}\)\s*$/, "");
      const homeCode = m.home.match(/\(([A-Z]{3})\)/)?.[1] ?? "HME";
      const away = m.away.replace(/\s*\([A-Z]{3}\)\s*$/, "");
      const awayCode = m.away.match(/\(([A-Z]{3})\)/)?.[1] ?? "AWY";
      return chrome(
        accent,
        `
        ${kicker(m.stage, 110, accent)}
        ${crest(homeCode, accent, 330, 290, 82)}
        ${crest(awayCode, "#94a3b8", 950, 290, 82)}
        <text x="640" y="305" font-size="66" fill="#ffffff" font-weight="800" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif">${esc(m.score.split("·")[0].trim())}</text>
        ${m.score.includes("pens") ? `<text x="640" y="355" font-size="22" fill="${accent}" font-weight="600" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif">pens ${esc(m.score.split("pens")[1].trim())}</text>` : ""}
        ${tspans(wrap(home, 20, 1), 330, 430, 24, "#e2e8f0", 1.2, 700)}
        ${tspans(wrap(away, 20, 1), 950, 430, 24, "#e2e8f0", 1.2, 700)}
        <text x="640" y="530" font-size="19" fill="#94a3b8" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" letter-spacing="2">${esc(m.venue.toUpperCase())}</text>
        <rect x="560" y="570" width="160" height="2" fill="${accent}" opacity="0.6"/>
      `,
      );
    }
    case "moment": {
      return chrome(
        accent,
        `
        ${kicker("key moment", 130, accent)}
        <polygon points="640,160 654,192 690,194 662,216 672,252 640,232 608,252 618,216 590,194 626,192" fill="${accent}"/>
        ${tspans(wrap(slide.title, 30, 2), cx, 320, 40, "#ffffff", 1.2, 800)}
        ${slide.subtitle ? `<text x="640" y="395" font-size="22" fill="${accent}" font-weight="600" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif">${esc(slide.subtitle)}</text>` : ""}
        ${(slide.body ?? []).map((b) => tspans(wrap(b, 62, 3), cx, 460, 21, "#cbd5e1", 1.45)).join("\n")}
      `,
      );
    }
    case "player": {
      return chrome(
        accent,
        `
        ${kicker(slide.subtitle ?? "key player", 140, accent)}
        <circle cx="640" cy="270" r="74" fill="${accent}" fill-opacity="0.12" stroke="${accent}" stroke-width="3"/>
        <polygon points="640,215 650,250 688,250 657,271 668,308 640,287 612,308 623,271 592,250 630,250" fill="${accent}"/>
        ${tspans(wrap(slide.title, 26, 2), cx, 400, 46, "#ffffff", 1.15, 800)}
        ${(slide.body ?? [])
          .map((b, i) => tspans(wrap(b, 55, 2), cx, 470 + i * 40, 22, i === 0 ? "#cbd5e1" : accent, 1.35, i === 0 ? 400 : 600))
          .join("\n")}
      `,
      );
    }
    case "stats": {
      const lines = slide.statLines ?? [];
      const startY = 260;
      const rowH = Math.min(74, 400 / Math.max(lines.length, 1));
      return chrome(
        accent,
        `
        ${kicker(slide.title, 140, accent)}
        ${lines
          .map((l, i) => {
            const y = startY + i * rowH;
            return `
            <rect x="330" y="${y - 28}" width="620" height="52" rx="10" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.08"/>
            <text x="360" y="${y + 6}" font-size="22" fill="#cbd5e1" font-family="Segoe UI, Arial, sans-serif">${esc(l.label)}</text>
            <text x="920" y="${y + 6}" font-size="24" fill="${accent}" font-weight="700" text-anchor="end" font-family="Segoe UI, Arial, sans-serif">${esc(l.value)}</text>`;
          })
          .join("\n")}
      `,
      );
    }
    case "verdict": {
      return chrome(
        accent,
        `
        ${kicker(slide.title, 150, accent)}
        <text x="360" y="240" font-size="120" fill="${accent}" fill-opacity="0.35" font-family="Georgia, serif">“</text>
        ${(slide.body ?? []).map((b) => tspans(wrap(b, 46, 5), cx, 280, 30, "#f1f5f9", 1.5, 500)).join("\n")}
        <rect x="560" y="600" width="160" height="2" fill="${accent}"/>
      `,
      );
    }
    case "outro": {
      return chrome(
        accent,
        `
        ${tspans(wrap(slide.title, 30, 2), cx, 300, 44, "#ffffff", 1.2, 800)}
        ${slide.subtitle ? tspans(wrap(slide.subtitle, 55, 1), cx, 420, 21, "#94a3b8") : ""}
        ${kicker("your world cup · your story", 500, accent)}
      `,
      );
    }
  }
}

/** Render one slide to a PNG buffer (1280×720). */
export async function renderSlidePng(slide: VideoSlide): Promise<Buffer> {
  const svg = renderSlide(slide);
  return sharp(Buffer.from(svg), { density: 96 })
    .resize(W, H)
    .png()
    .toBuffer();
}
