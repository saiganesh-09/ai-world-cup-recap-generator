"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, Input, TeamCrest } from "@/components/ui/primitives";
import { Flag } from "@/components/ui/flag";

// ── Types (serialized from server) ──────────────────────────
interface Tournament {
  id: string;
  name: string;
  year: number;
  country: string;
  isDemo: boolean;
}
interface Team {
  id: string;
  name: string;
  shortName: string;
  country: string;
  flagEmoji: string | null;
  primaryColor: string;
}
interface Player {
  id: string;
  name: string;
  position: string;
  jerseyNumber: number;
  team: { name: string; shortName: string };
}

const RECAP_TYPES = [
  { value: "TEAM_JOURNEY", label: "Team Journey", desc: "The full tournament arc of your team" },
  { value: "PLAYER_JOURNEY", label: "Player Journey", desc: "Follow one hero through the tournament" },
  { value: "TOURNAMENT_HIGHLIGHTS", label: "Tournament Highlights", desc: "The best of everything" },
  { value: "BEST_MATCHES", label: "Best Matches", desc: "The most dramatic games relived" },
  { value: "EMOTIONAL_STORY", label: "Emotional Story", desc: "Pressure, heartbreak, triumph" },
  { value: "STATISTICAL_BREAKDOWN", label: "Statistical Breakdown", desc: "The story in the numbers" },
] as const;

const TONES = [
  { value: "EXCITING", label: "Exciting", desc: "High energy, stadium roar" },
  { value: "EMOTIONAL", label: "Emotional", desc: "What it meant to the fans" },
  { value: "PROFESSIONAL", label: "Professional", desc: "Analyst's eye, measured" },
  { value: "STATISTICAL", label: "Statistical", desc: "Numbers first" },
  { value: "COMMENTARY", label: "Commentary Style", desc: "Narrated like live TV" },
] as const;

const LENGTHS = [
  { value: "SHORT", label: "Short", desc: "~60 seconds" },
  { value: "STANDARD", label: "Standard", desc: "~2 minutes" },
  { value: "EXTENDED", label: "Extended", desc: "~4–5 minutes" },
] as const;

const NEEDS_TEAM: string[] = ["TEAM_JOURNEY", "PLAYER_JOURNEY", "EMOTIONAL_STORY", "STATISTICAL_BREAKDOWN"];
const NEEDS_PLAYER: string[] = ["PLAYER_JOURNEY"];

const STEPS = ["Tournament", "Focus", "Type", "Tone", "Length", "Review"];

export function CreateWizard({ tournaments }: { tournaments: Tournament[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [tournamentId, setTournamentId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [type, setType] = useState<string>("TEAM_JOURNEY");
  const [tone, setTone] = useState<string>("EXCITING");
  const [length, setLength] = useState<string>("STANDARD");

  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tournament = tournaments.find((t) => t.id === tournamentId);
  const team = teams.find((t) => t.id === teamId);
  const player = players.find((p) => p.id === playerId);

  // Load teams when tournament changes.
  useEffect(() => {
    if (!tournamentId) return;
    let cancelled = false;
    fetch(`/api/teams?tournamentId=${tournamentId}`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setTeams(j.data ?? []); })
      .catch(() => { if (!cancelled) setTeams([]); })
      .finally(() => { if (!cancelled) setLoadingData(false); });
    return () => { cancelled = true; };
  }, [tournamentId]);

  // Load players when a team is selected (for player journeys).
  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    fetch(`/api/players?teamId=${teamId}`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setPlayers(j.data ?? []); })
      .catch(() => { if (!cancelled) setPlayers([]); });
    return () => { cancelled = true; };
  }, [teamId]);

  function selectTournament(id: string) {
    setTournamentId(id);
    setTeamId("");
    setPlayerId("");
    setTeams([]);
    setPlayers([]);
    setLoadingData(true);
  }

  function selectTeam(id: string) {
    setTeamId(id);
    setPlayerId("");
    setPlayers([]);
  }

  // Debounced client-side team search.
  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) => t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q));
  }, [teams, search]);

  const needsTeam = NEEDS_TEAM.includes(type);
  const needsPlayer = NEEDS_PLAYER.includes(type);

  function canContinue(): boolean {
    switch (step) {
      case 0: return !!tournamentId;
      case 1:
        if (needsPlayer) return !!playerId;
        if (needsTeam) return !!teamId;
        return true; // tournament-wide types need no selection
      case 2: return !!type;
      case 3: return !!tone;
      case 4: return !!length;
      default: return true;
    }
  }

  async function generate() {
    setSubmitting(true);
    setError(null);
    try {
      const create = await fetch("/api/recaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          teamId: teamId || undefined,
          playerId: playerId || undefined,
          type,
          tone,
          length,
        }),
      });
      const created = await create.json();
      if (create.status === 401) {
        router.push("/login");
        return;
      }
      if (!create.ok) {
        setError(created.error?.message ?? "Could not create the recap.");
        return;
      }
      const recapId = created.data.id;
      const gen = await fetch(`/api/recaps/${recapId}/generate`, { method: "POST" });
      if (!gen.ok) {
        const j = await gen.json().catch(() => ({}));
        setError(j.error?.message ?? "Generation could not start.");
        return;
      }
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "recap_created", metadata: { recapId } }),
      }).catch(() => {});
      router.push(`/recaps/${recapId}`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Stepper */}
      <ol className="mb-10 flex items-center gap-2" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                i < step ? "bg-gold" : i === step ? "bg-sky-500" : "bg-surface-2"
              }`}
            />
            <span className={`hidden text-[11px] sm:block ${i === step ? "text-white" : "text-slate-500"}`}>
              {label}
            </span>
          </li>
        ))}
      </ol>

      {error && (
        <p role="alert" className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* STEP 0 — tournament */}
      {step === 0 && (
        <section aria-labelledby="s0">
          <h2 id="s0" className="text-2xl font-bold">Choose a tournament</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTournament(t.id)}
                aria-pressed={tournamentId === t.id}
                className={`card card-hover p-5 text-left ${tournamentId === t.id ? "ring-2 ring-gold" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-extrabold text-sky-400">{t.year}</span>
                  {t.isDemo && <Badge color="gold">demo</Badge>}
                </div>
                <div className="mt-2 font-semibold">{t.name}</div>
                <div className="text-sm text-muted">{t.country}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* STEP 1 — focus */}
      {step === 1 && (
        <section aria-labelledby="s1">
          <h2 id="s1" className="text-2xl font-bold">
            {type === "TOURNAMENT_HIGHLIGHTS" || type === "BEST_MATCHES"
              ? "Focus (optional)"
              : needsPlayer
                ? "Pick your hero"
                : "Pick your team"}
          </h2>
          <div className="relative mt-6">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              className="pl-10"
              placeholder="Search teams…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search teams"
            />
          </div>
          {loadingData ? (
            <div className="mt-8 flex justify-center text-muted"><Loader2 className="animate-spin" /></div>
          ) : (
            <div className="mt-4 grid max-h-80 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {filteredTeams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTeam(t.id)}
                  aria-pressed={teamId === t.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    teamId === t.id ? "border-gold bg-gold/10" : "border-line bg-surface hover:border-sky-500/50"
                  }`}
                >
                  <TeamCrest short={t.shortName} color={t.primaryColor} size={34} />
                  <Flag country={t.country} size="lg" />
                  <span className="font-medium">{t.name}</span>
                  {teamId === t.id && <Check size={16} className="ml-auto text-gold" />}
                </button>
              ))}
              {filteredTeams.length === 0 && (
                <p className="col-span-2 py-6 text-center text-sm text-muted">No teams match that search.</p>
              )}
            </div>
          )}

          {/* Player picker (shown when a team is chosen and player journey selected or optional star pick) */}
          {teamId && players.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-300">
                {needsPlayer ? "Select a player *" : "Or spotlight a player (optional)"}
              </h3>
              <div className="mt-3 grid max-h-56 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                {players.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlayerId(playerId === p.id ? "" : p.id)}
                    aria-pressed={playerId === p.id}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${
                      playerId === p.id ? "border-gold bg-gold/10" : "border-line bg-surface hover:border-sky-500/50"
                    }`}
                  >
                    <span className="w-6 text-center font-mono text-xs text-slate-500">{p.jerseyNumber}</span>
                    <span className="font-medium">{p.name}</span>
                    <Badge className="ml-auto">{p.position}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* STEP 2 — type */}
      {step === 2 && (
        <section aria-labelledby="s2">
          <h2 id="s2" className="text-2xl font-bold">What kind of recap?</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {RECAP_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                aria-pressed={type === t.value}
                className={`card p-4 text-left card-hover ${type === t.value ? "ring-2 ring-gold" : ""}`}
              >
                <div className="font-semibold">{t.label}</div>
                <div className="mt-1 text-sm text-muted">{t.desc}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* STEP 3 — tone */}
      {step === 3 && (
        <section aria-labelledby="s3">
          <h2 id="s3" className="text-2xl font-bold">Set the tone</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                aria-pressed={tone === t.value}
                className={`card p-4 text-left card-hover ${tone === t.value ? "ring-2 ring-gold" : ""}`}
              >
                <div className="font-semibold">{t.label}</div>
                <div className="mt-1 text-sm text-muted">{t.desc}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* STEP 4 — length */}
      {step === 4 && (
        <section aria-labelledby="s4">
          <h2 id="s4" className="text-2xl font-bold">How long?</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {LENGTHS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLength(l.value)}
                aria-pressed={length === l.value}
                className={`card p-5 text-center card-hover ${length === l.value ? "ring-2 ring-gold" : ""}`}
              >
                <div className="text-lg font-semibold">{l.label}</div>
                <div className="mt-1 text-sm text-muted">{l.desc}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* STEP 5 — review */}
      {step === 5 && (
        <section aria-labelledby="s5">
          <h2 id="s5" className="text-2xl font-bold">Ready to generate</h2>
          <Card className="mt-6 divide-y divide-line/60">
            {[
              ["Tournament", tournament ? `${tournament.name} (${tournament.country})` : "—"],
              ["Team", team?.name ?? "—"],
              ["Player", player?.name ?? (needsPlayer ? "—" : "None")],
              ["Type", RECAP_TYPES.find((t) => t.value === type)?.label],
              ["Tone", TONES.find((t) => t.value === tone)?.label],
              ["Length", LENGTHS.find((l) => l.value === length)?.desc],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between px-5 py-3.5 text-sm">
                <span className="text-muted">{k}</span>
                <span className="font-medium text-right">{v}</span>
              </div>
            ))}
          </Card>
          {tournament?.isDemo && (
            <p className="mt-4 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-xs text-amber-200/90">
              This tournament is a simulated demo dataset — results are fictional and
              generated for demonstration purposes.
            </p>
          )}
        </section>
      )}

      {/* nav buttons */}
      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
          <ArrowLeft size={16} /> Back
        </Button>
        {step < 5 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue()}>
            Continue <ArrowRight size={16} />
          </Button>
        ) : (
          <Button onClick={generate} disabled={submitting || !canContinue()} size="lg">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {submitting ? "Generating…" : "Generate My Recap"}
          </Button>
        )}
      </div>
    </div>
  );
}
