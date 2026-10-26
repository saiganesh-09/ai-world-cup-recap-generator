import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Star } from "lucide-react";
import { GenerationProgress } from "@/components/recap/generation-progress";
import { RetryGenerateButton } from "@/components/recap/retry-button";
import { ShareButton } from "@/components/recap/share-button";
import { Badge, Card, TeamCrest } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth";
import { recapRepo } from "@/repositories/recap.repository";
import type { RecapStory } from "@/services/ai/schemas";

export const metadata: Metadata = { title: "Recap" };

const STAGE_NAME: Record<string, string> = {
  GROUP: "Group stage",
  ROUND_OF_16: "Round of 16",
  QUARTER_FINAL: "Quarter-final",
  SEMI_FINAL: "Semi-final",
  THIRD_PLACE: "Third place",
  FINAL: "Final",
};

export default async function RecapPage(ctx: PageProps<"/recaps/[id]">) {
  const user = await requireUser();
  const { id } = await ctx.params;
  const recap = await recapRepo.forUserById(id, user.id);
  if (!recap) notFound();

  if (recap.status === "GENERATING" || recap.status === "DRAFT") {
    return (
      <GenerationProgress
        recapId={recap.id}
        teamName={recap.team?.name ?? recap.player?.name ?? ""}
      />
    );
  }

  const story = (recap.story ?? null) as RecapStory | null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {recap.team && (
              <TeamCrest short={recap.team.shortName} color={recap.team.primaryColor} size={44} />
            )}
            <div>
              <h1 className="text-3xl font-bold">{recap.title}</h1>
              <p className="mt-1 text-sm text-muted">
                {recap.tournament.name} · {recap.tournament.country}
                {recap.tournament.isDemo && <Badge color="gold" className="ml-2">simulated</Badge>}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {recap.status === "FAILED" && <RetryGenerateButton recapId={recap.id} />}
          <ShareButton title={recap.title} />
        </div>
      </div>

      {recap.status === "FAILED" && (
        <Card className="border-red-500/30 bg-red-500/5 p-5">
          <p className="text-sm text-red-300">
            Generation failed{recap.error ? `: ${recap.error}` : ""}. You can retry — your recap data is intact.
          </p>
        </Card>
      )}

      {/* Video */}
      {recap.videoUrl && (
        <Card className="overflow-hidden">
          <video
            src={recap.videoUrl}
            poster={recap.thumbnailUrl ?? undefined}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full bg-black"
            aria-label={`${recap.title} video`}
          />
        </Card>
      )}

      {/* AI story */}
      {story && (
        <>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gold">Tournament Summary</h2>
            <p className="mt-3 leading-relaxed text-slate-300">{story.tournamentStory}</p>
          </Card>

          {/* Biggest moments */}
          {recap.moments.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gold">Biggest Moments</h2>
              <ol className="mt-4 space-y-3">
                {recap.moments.map((m) => (
                  <li key={m.id} className="flex gap-4 rounded-xl bg-surface-2/60 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/15 font-bold text-gold">
                      {m.importanceScore}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{m.title}</p>
                      <p className="mt-0.5 text-sm text-muted">{m.description}</p>
                      {m.match && (
                        <p className="mt-1 text-xs text-slate-500">
                          {m.match.homeTeam.name} {m.match.homeScore}–{m.match.awayScore} {m.match.awayTeam.name}
                          {m.minute != null && ` · ${m.minute}'`}
                          {m.player && ` · ${m.player.name}`}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Key players */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gold">Key Players</h2>
              <ul className="mt-4 space-y-3">
                {story.keyPlayers.map((p) => (
                  <li key={p.name} className="flex items-start gap-3">
                    <Star size={16} className="mt-1 shrink-0 text-sky-400" />
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-muted">{p.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Turning points */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gold">Turning Points</h2>
              <ul className="mt-4 space-y-3">
                {story.turningPoints.map((t, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-xs font-bold text-sky-400">
                      {i + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Statistics highlights */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gold">By the Numbers</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {story.statisticsHighlights.map((s, i) => (
                <li key={i} className="rounded-xl bg-surface-2/60 px-4 py-3 text-sm text-slate-300">
                  {s}
                </li>
              ))}
            </ul>
          </Card>

          {/* Match timeline */}
          {recap.moments.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gold">Match Timeline</h2>
              <ol className="relative mt-6 space-y-6 border-l-2 border-line pl-6">
                {[...new Map(recap.moments.filter(m => m.match).map(m => [m.match!.id, m.match!])).values()]
                  .map((m) => (
                    <li key={m.id} className="relative">
                      <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-pitch bg-gold" />
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{STAGE_NAME[m.stage] ?? m.stage}</Badge>
                        <span className="text-xs text-slate-500">
                          <CalendarDays size={11} className="mr-1 inline" />
                          {new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="mt-1 font-medium">
                        {m.homeTeam.name} {m.homeScore}–{m.awayScore} {m.awayTeam.name}
                        {m.homePenScore != null && (
                          <span className="text-sm text-muted"> ({m.homePenScore}–{m.awayPenScore} pens)</span>
                        )}
                      </p>
                    </li>
                  ))}
              </ol>
            </Card>
          )}

          {/* Verdict */}
          <Card className="border-gold/20 bg-gradient-to-br from-gold/5 to-transparent p-6">
            <h2 className="text-lg font-semibold text-gold">AI Final Verdict</h2>
            <p className="mt-3 text-lg leading-relaxed text-slate-200">{story.finalVerdict}</p>
          </Card>
        </>
      )}

      <p className="text-center text-sm text-muted">
        <Link href="/recaps" className="text-sky-400 hover:underline">← Back to my recaps</Link>
      </p>
    </div>
  );
}
