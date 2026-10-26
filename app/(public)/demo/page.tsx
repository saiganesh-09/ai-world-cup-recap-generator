import type { Metadata } from "next";
import { existsSync } from "node:fs";
import path from "node:path";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import type { RecapStory } from "@/services/ai/schemas";
import { Play } from "lucide-react";

export const metadata: Metadata = {
  title: "Live Demo — Argentina's 2022 World Cup Story",
};

// Public, no-auth demo: the seeded Argentina recap so a visitor can
// experience the product in under a minute.
export default async function DemoPage() {
  const recap = await prisma.recap.findUnique({
    where: { id: "seed-demo-recap-arg" },
    include: {
      team: true,
      tournament: true,
      moments: { orderBy: { order: "asc" }, take: 5 },
    },
  });
  const story = recap?.story as RecapStory | null;
  const videoPath = recap
    ? path.join(process.cwd(), "public", "generated", "recaps", `${recap.id}.mp4`)
    : null;
  const hasVideo = videoPath ? existsSync(videoPath) : false;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Badge color="gold">Live demo — no sign-up needed</Badge>
      <h1 className="mt-3 text-4xl font-bold">{recap?.title ?? "Argentina's World Cup Journey"}</h1>
      <p className="mt-2 text-muted">{recap?.tournament.name} · Qatar 2022 · Team Journey · Exciting</p>

      {hasVideo && recap?.videoUrl ? (
        <Card className="mt-8 overflow-hidden">
          <video
            src={recap.videoUrl}
            poster={recap.thumbnailUrl ?? undefined}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full bg-black"
          />
        </Card>
      ) : (
        <Card className="mt-8 flex aspect-video flex-col items-center justify-center bg-surface/60 p-8 text-center">
          <Play size={40} className="text-slate-600" />
          <p className="mt-4 max-w-sm text-sm text-muted">
            The demo video renders on first generation. Sign in with the demo
            account (<strong>demo@worldcup.ai / demo1234</strong>) to generate it
            and your own recaps.
          </p>
        </Card>
      )}

      {story && (
        <div className="mt-8 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gold">The story</h2>
            <p className="mt-3 leading-relaxed text-slate-300">{story.tournamentStory}</p>
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gold">Biggest moments</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {story.biggestMoments.slice(0, 5).map((m, i) => (
                  <li key={i} className="flex gap-2"><span className="text-gold">{i + 1}.</span>{m}</li>
                ))}
              </ul>
            </Card>
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gold">Final verdict</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{story.finalVerdict}</p>
            </Card>
          </div>
        </div>
      )}

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <ButtonLink href="/create" size="lg">Create your own recap</ButtonLink>
        <ButtonLink href="/engineering" variant="secondary" size="lg">How it&rsquo;s built</ButtonLink>
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">
        Demo login: <strong>demo@worldcup.ai</strong> / <strong>demo1234</strong>
      </p>
    </div>
  );
}
