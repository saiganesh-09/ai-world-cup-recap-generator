import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { Card } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold text-slate-950">
            <Trophy size={24} />
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Sign in to your recaps</p>
        </div>
        <AuthForm mode="login" />
        <div className="mt-6 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-center text-xs text-sky-300">
          Demo account — <strong>demo@worldcup.ai</strong> / <strong>demo1234</strong>
        </div>
      </Card>
    </main>
  );
}
