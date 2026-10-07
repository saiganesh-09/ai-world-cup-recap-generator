"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Users,
  User,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Check,
  Loader2,
  Route,
  Star,
  Swords,
  HeartPulse,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag } from "@/components/flag";
import { cn } from "@/lib/utils";
import {
  RECAP_TYPE_LABELS,
  TONE_LABELS,
  DURATION_LABELS,
  RECAP_TYPE_DESCRIPTIONS,
  TONE_DESCRIPTIONS,
  DURATION_DESCRIPTIONS,
} from "@/lib/utils";

export interface WizardTournament {
  id: string;
  name: string;
  year: number;
  hostCountry: string;
}
export interface WizardTeam {
  id: string;
  name: string;
  shortName: string;
  flag: string;
  fifaRanking: number | null;
}
export interface WizardPlayer {
  id: string;
  name: string;
  position: string;
  jerseyNumber: number;
  teamName: string;
  teamShortName: string;
}

const STEPS = ["Tournament", "Subject", "Recap Type", "Tone", "Length", "Generate"];

const TYPE_ICONS: Record<string, LucideIcon> = {
  TEAM_JOURNEY: Route,
  PLAYER_JOURNEY: Star,
  TOURNAMENT_HIGHLIGHTS: Trophy,
  BEST_MATCHES: Swords,
  EMOTIONAL_STORY: HeartPulse,
  STATISTICAL_BREAKDOWN: BarChart3,
};

const STEP_HINTS = [
  "Pick which World Cup edition you want to relive.",
  "Choose a team, a player, or the whole tournament.",
  "Decide the shape of the story — we'll build the moments around it.",
  "This sets how the narrator sounds in your video.",
  "Longer recaps include more moments and detail.",
];

const NEEDS_TEAM = ["TEAM_JOURNEY", "EMOTIONAL_STORY", "STATISTICAL_BREAKDOWN", "BEST_MATCHES"];
const NEEDS_PLAYER = ["PLAYER_JOURNEY"];

export function RecapWizard({
  tournaments,
  teams,
  players,
}: {
  tournaments: WizardTournament[];
  teams: WizardTeam[];
  players: WizardPlayer[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [tournamentId, setTournamentId] = useState<string | null>(
    tournaments[0]?.id ?? null,
  );
  const [mode, setMode] = useState<"team" | "player" | "tournament">("team");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [type, setType] = useState<string>("TEAM_JOURNEY");
  const [tone, setTone] = useState<string>("EXCITING");
  const [duration, setDuration] = useState<string>("STANDARD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTeam = teams.find((t) => t.id === teamId);
  const selectedPlayer = players.find((p) => p.id === playerId);
  const tournament = tournaments.find((t) => t.id === tournamentId);

  const validTypes = useMemo(() => {
    return Object.keys(RECAP_TYPE_LABELS).filter((t) => {
      if (NEEDS_PLAYER.includes(t)) return mode === "player" && !!playerId;
      if (NEEDS_TEAM.includes(t)) return mode === "team" && !!teamId;
      return true;
    });
  }, [mode, teamId, playerId]);

  function canNext(): boolean {
    switch (step) {
      case 0:
        return !!tournamentId;
      case 1:
        return (
          (mode === "team" && !!teamId) ||
          (mode === "player" && !!playerId) ||
          mode === "tournament"
        );
      case 2:
        return validTypes.includes(type);
      default:
        return true;
    }
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/recaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          teamId: mode === "team" ? teamId : null,
          playerId: mode === "player" ? playerId : null,
          type,
          tone,
          duration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create recap");

      const gen = await fetch(`/api/recaps/${data.recap.id}/generate`, {
        method: "POST",
      });
      if (!gen.ok) {
        const g = await gen.json();
        throw new Error(g.error ?? "Failed to start generation");
      }
      router.push(`/recaps/${data.recap.id}?generating=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  const subjectOk =
    mode === "tournament" || (mode === "team" && teamId) || (mode === "player" && playerId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Stepper */}
      <ol className="flex items-center gap-1" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-1.5">
            <div
              className={cn(
                "h-1.5 rounded-full transition-colors",
                i <= step ? "bg-accent" : "bg-surface-2",
              )}
            />
            <span
              className={cn(
                "hidden text-[10px] font-medium uppercase tracking-wider sm:block",
                i === step ? "text-accent" : "text-muted/60",
              )}
            >
              {s}
            </span>
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="p-6 md:p-8">
          {step < 5 && (
            <p className="mb-4 text-sm text-muted">{STEP_HINTS[step]}</p>
          )}
          {/* STEP 0 — tournament */}
          {step === 0 && (
            <fieldset>
              <legend className="mb-4 text-xl font-bold">Choose a tournament</legend>
              <div className="grid gap-3">
                {tournaments.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTournamentId(t.id)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-4 text-left transition-all",
                      tournamentId === t.id
                        ? "border-accent bg-accent/10"
                        : "border-border bg-surface-2/40 hover:border-accent/40",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Trophy className="size-5 text-accent" aria-hidden />
                      <div>
                        <p className="font-semibold">{t.name}</p>
                        <p className="text-sm text-muted">{t.hostCountry}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{t.year}</Badge>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* STEP 1 — subject */}
          {step === 1 && (
            <fieldset>
              <legend className="mb-4 text-xl font-bold">Whose story?</legend>
              <div className="mb-5 flex gap-2" role="tablist" aria-label="Subject kind">
                {(
                  [
                    { key: "team", label: "A team", icon: Users },
                    { key: "player", label: "A player", icon: User },
                    { key: "tournament", label: "Whole tournament", icon: Trophy },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    role="tab"
                    aria-selected={mode === m.key}
                    onClick={() => setMode(m.key)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                      mode === m.key
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted hover:border-accent/40",
                    )}
                  >
                    <m.icon className="size-4" aria-hidden /> {m.label}
                  </button>
                ))}
              </div>

              {mode === "team" && (
                <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTeamId(t.id)}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
                        teamId === t.id
                          ? "border-accent bg-accent/10"
                          : "border-border bg-surface-2/40 hover:border-accent/40",
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <Flag code={t.shortName} name={t.name} className="text-xl" />
                        <span className="font-medium">{t.name}</span>
                      </span>
                      <span className="text-xs text-muted">#{t.fifaRanking}</span>
                    </button>
                  ))}
                </div>
              )}

              {mode === "player" && (
                <div className="grid max-h-80 grid-cols-1 gap-2 overflow-y-auto pr-1">
                  {players.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlayerId(p.id)}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
                        playerId === p.id
                          ? "border-accent bg-accent/10"
                          : "border-border bg-surface-2/40 hover:border-accent/40",
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="flex size-7 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-accent">
                          {p.jerseyNumber}
                        </span>
                        <span className="font-medium">{p.name}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        <Flag code={p.teamShortName} name={p.teamName} />
                        {p.teamName} · {p.position}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {mode === "tournament" && (
                <p className="rounded-lg border border-border bg-surface-2/40 p-4 text-sm text-muted">
                  A tournament-wide recap — best matches, biggest upsets, and the
                  story of how the trophy was won.
                </p>
              )}
            </fieldset>
          )}

          {/* STEP 2 — type */}
          {step === 2 && (
            <fieldset>
              <legend className="mb-4 text-xl font-bold">What kind of recap?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(RECAP_TYPE_LABELS).map(([key, label]) => {
                  const enabled = validTypes.includes(key);
                  const Icon = TYPE_ICONS[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!enabled}
                      onClick={() => setType(key)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-4 text-left transition-all disabled:opacity-35",
                        type === key && enabled
                          ? "border-accent bg-accent/10"
                          : "border-border bg-surface-2/40 hover:border-accent/40",
                      )}
                    >
                      <Icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                      <span>
                        <span className="block font-medium">{label}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                          {RECAP_TYPE_DESCRIPTIONS[key]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* STEP 3 — tone */}
          {step === 3 && (
            <fieldset>
              <legend className="mb-4 text-xl font-bold">Pick a tone</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(TONE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTone(key)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all",
                      tone === key
                        ? "border-accent bg-accent/10"
                        : "border-border bg-surface-2/40 hover:border-accent/40",
                    )}
                  >
                    <span
                      className={cn(
                        "block font-medium",
                        tone === key && "text-accent",
                      )}
                    >
                      {label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                      {TONE_DESCRIPTIONS[key]}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* STEP 4 — duration */}
          {step === 4 && (
            <fieldset>
              <legend className="mb-4 text-xl font-bold">How long?</legend>
              <div className="grid gap-3">
                {Object.entries(DURATION_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDuration(key)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-4 text-left transition-all",
                      duration === key
                        ? "border-accent bg-accent/10"
                        : "border-border bg-surface-2/40 hover:border-accent/40",
                    )}
                  >
                    <span>
                      <span className="block font-medium">{label}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {DURATION_DESCRIPTIONS[key]}
                      </span>
                    </span>
                    {duration === key && <Check className="size-4 shrink-0 text-accent" aria-hidden />}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* STEP 5 — review + generate */}
          {step === 5 && (
            <div>
              <h2 className="mb-4 text-xl font-bold">Ready when you are</h2>
              <dl className="mb-6 grid gap-2 rounded-xl border border-border bg-surface-2/40 p-5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Tournament</dt>
                  <dd className="font-medium">{tournament?.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Subject</dt>
                  <dd className="font-medium">
                    {mode === "team"
                      ? selectedTeam?.name
                      : mode === "player"
                        ? selectedPlayer?.name
                        : "Whole tournament"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Recap type</dt>
                  <dd className="font-medium">{RECAP_TYPE_LABELS[type]}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Tone</dt>
                  <dd className="font-medium">{TONE_LABELS[tone]}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Length</dt>
                  <dd className="font-medium">{DURATION_LABELS[duration]}</dd>
                </div>
              </dl>

              {error && (
                <p role="alert" className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              )}

              <Button
                size="lg"
                className="w-full"
                onClick={generate}
                disabled={busy || !subjectOk}
              >
                {busy ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden /> Starting…
                  </>
                ) : (
                  <>
                    <Wand2 aria-hidden /> Generate My Recap
                  </>
                )}
              </Button>
              <p className="mt-3 text-center text-xs text-muted">
                Generation runs in the background — you can watch real progress
                on the recap page.
              </p>
            </div>
          )}

          {/* Nav */}
          {step < 5 && (
            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                <ChevronLeft aria-hidden /> Back
              </Button>
              <Button onClick={() => canNext() && setStep((s) => s + 1)} disabled={!canNext()}>
                Next <ChevronRight aria-hidden />
              </Button>
            </div>
          )}
          {step === 5 && !busy && (
            <div className="mt-4">
              <Button variant="ghost" onClick={() => setStep(4)}>
                <ChevronLeft aria-hidden /> Back
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
