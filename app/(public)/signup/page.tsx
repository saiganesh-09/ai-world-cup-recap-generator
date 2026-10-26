import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { Card } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold text-slate-950">
            <Trophy size={24} />
          </div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-muted">Start building recaps in minutes</p>
        </div>
        <AuthForm mode="signup" />
      </Card>
    </main>
  );
}
