import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { VideoPlayer } from "@/components/recap/video-player";
import { STAGE_LABELS, formatDate } from "@/lib/utils";
import type { AiRecapOutput } from "@/types";
import type { Prisma } from "@prisma/client";
import { Sparkles, Timer, MapPin, Star } from "lucide-react";

export type RecapWithRelations = Prisma.RecapGetPayload<{
  include: {
    tournament: true;
    team: true;
    player: true;
    moments: {
      include: { match: { include: { homeTeam: true; awayTeam: true } }; player: true };
      orderBy: { order: "asc" };
    };
  };
}>;

const TYPE_LABELS: Record<string, string> = {
  TEAM_JOURNEY: "Team Journey",
  PLAYER_JOURNEY: "Player Journey",
  TOURNAMENT_HIGHLIGHTS: "Tournament Highlights",
  BEST_MATCHES: "Best Matches",
  EMOTIONAL_STORY: "Emotional Story",
  STATISTICAL_BREAKDOWN: "Statistical Breakdown",
};

function importanceVariant(score: number) {
  if (score >= 80) return "default" as const;
  if (score >= 60) return "secondary" as const;
  return "outline" as const;
}

/** Full rendered recap — used on owner and public share pages. */
export function RecapView({ recap }: { recap: RecapWithRelations }) {
  const story = recap.story as AiRecapOutput | null;
  const subject =
    recap.player?.name ?? recap.team?.name ?? recap.tournament.name;

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge>{TYPE_LABELS[recap.type] ?? recap.type}</Badge>
            <Badge variant="secondary">{recap.tournament.name}</Badge>
            {recap.durationSec && (
              <Badge variant="secondary">
                <Timer className="size-3" aria-hidden /> {recap.durationSec}s
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {recap.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {subject} · Created {formatDate(recap.createdAt)}
          </p>
        </div>
      </header>

      {recap.videoUrl && (
        <VideoPlayer
          src={recap.videoUrl}
          poster={recap.thumbnailUrl}
          title={recap.title}
        />
      )}

      {recap.summary && (
        <p className="max-w-3xl text-lg leading-relaxed text-foreground/90">
          {recap.summary}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Story */}
          {story?.tournamentStory && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-4 text-accent" aria-hidden />
                  Tournament Story
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-sm leading-relaxed text-foreground/85">
                {story.tournamentStory.split("\n").filter(Boolean).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Moments */}
          <Card>
            <CardHeader>
              <CardTitle>Biggest Moments</CardTitle>
              <CardDescription>
                Selected by the importance engine — scored 0–100
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3">
                {(recap.moments.length
                  ? recap.moments.map((m) => ({
                      title: m.title,
                      description: m.description,
                      score: m.importanceScore,
                      meta: m.match
                        ? `${m.match.homeTeam.shortName} ${m.match.homeScore}–${m.match.awayScore} ${m.match.awayTeam.shortName}${m.minute != null ? ` · ${m.minute}'` : ""}`
                        : null,
                    }))
                  : (story?.biggestMoments ?? []).map((m) => ({
                      title: m.title,
                      description: m.description,
                      score: null,
                      meta: m.matchLabel ?? null,
                    }))
                ).map((m, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-2/40 p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">{m.title}</p>
                      {m.meta && (
                        <p className="mt-0.5 text-xs font-medium text-accent">
                          {m.meta}
                        </p>
                      )}
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">
                        {m.description}
                      </p>
                    </div>
                    {m.score != null && (
                      <Badge variant={importanceVariant(m.score)} className="shrink-0">
                        {m.score}
                      </Badge>
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Turning points */}
          {story?.turningPoints?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Turning Points</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {story.turningPoints.map((t, i) => (
                  <div key={i} className="border-l-2 border-accent pl-4">
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="mt-1 text-sm text-muted">{t.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Match timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Match Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative ml-2 flex flex-col gap-4 border-l border-border pl-6">
                {(() => {
                  const seen = new Set<string>();
                  return recap.moments
                    .map((m) => m.match)
                    .filter((m): m is NonNullable<typeof m> => {
                      if (!m || seen.has(m.id)) return false;
                      seen.add(m.id);
                      return true;
                    })
                    .map((m) => (
                      <li key={m.id} className="relative">
                        <span
                          className="absolute -left-[29px] top-1.5 size-2.5 rounded-full bg-accent"
                          aria-hidden
                        />
                        <p className="text-sm font-semibold">
                          {m.homeTeam.name} {m.homeScore}–{m.awayScore}{" "}
                          {m.awayTeam.name}
                          {m.homePenalties != null &&
                            ` (${m.homePenalties}–${m.awayPenalties} pens)`}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                          <span>{STAGE_LABELS[m.stage]}</span>·
                          <span>{formatDate(m.date)}</span>·
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" aria-hidden />
                            {m.venue}
                          </span>
                        </p>
                      </li>
                    ));
                })()}
              </ol>
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          {/* Stats */}
          {story?.statisticsHighlights?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-3">
                  {story.statisticsHighlights.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-surface-2/40 px-3.5 py-2.5"
                    >
                      <dt className="text-sm text-muted">{s.label}</dt>
                      <dd className="text-sm font-bold text-accent">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ) : null}

          {/* Key players */}
          {story?.keyPlayers?.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="size-4 text-accent" aria-hidden />
                  Key Players
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {story.keyPlayers.map((p, i) => (
                  <div key={i}>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">
                      {p.note}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Verdict */}
          {story?.finalVerdict && (
            <Card className="border-accent/30 bg-accent/5">
              <CardHeader>
                <CardTitle>Final Verdict</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm italic leading-relaxed text-foreground/90">
                  “{story.finalVerdict}”
                </p>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </article>
  );
}
