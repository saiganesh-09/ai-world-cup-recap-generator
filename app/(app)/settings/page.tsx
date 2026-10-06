import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { hasOpenAI, hasSportsApi } from "@/lib/env";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, KeyRound, Database, BrainCircuit } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const env = getEnv();

  const integrations = [
    {
      icon: BrainCircuit,
      name: "OpenAI (narrative, TTS, Whisper)",
      configured: hasOpenAI(),
      note: hasOpenAI()
        ? `Model: ${env.OPENAI_TEXT_MODEL}`
        : "Not configured — deterministic fallback narrative + synthesized audio active",
    },
    {
      icon: Database,
      name: "Sports data provider",
      configured: hasSportsApi(),
      note: hasSportsApi()
        ? "API-Football ingestion mode"
        : "Demo mode — seeded World Cup 2026 dataset",
    },
  ];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">Account and integrations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent/15 text-lg font-bold text-accent">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
          {user.role === "ADMIN" && (
            <Badge className="ml-auto">Demo account</Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-accent" aria-hidden />
            Integrations
          </CardTitle>
          <CardDescription>
            External services power AI features — the app degrades gracefully
            when keys are absent.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {integrations.map((i) => (
            <div
              key={i.name}
              className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-2/40 p-4"
            >
              <div className="flex items-start gap-3">
                <i.icon className="mt-0.5 size-5 text-accent" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">{i.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{i.note}</p>
                </div>
              </div>
              {i.configured ? (
                <Badge variant="success" className="shrink-0">
                  <Check className="size-3" aria-hidden /> Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="shrink-0">
                  <X className="size-3" aria-hidden /> Demo
                </Badge>
              )}
            </div>
          ))}
          <p className="text-xs text-muted">
            Keys are set server-side via environment variables — see
            .env.example. They are never exposed to the browser.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
