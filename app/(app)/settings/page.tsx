import type { Metadata } from "next";
import { Card } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card className="p-6">
        <h2 className="font-semibold">Profile</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Name</dt>
            <dd className="font-medium">{user.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Member since</dt>
            <dd className="font-medium">
              {user.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </dd>
          </div>
        </dl>
      </Card>
      <Card className="p-6">
        <h2 className="font-semibold">About</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          AI World Cup Recap Generator — a portfolio-grade demonstration of a
          full-stack AI pipeline: Next.js, PostgreSQL, structured LLM output,
          speech-to-text, and FFmpeg video rendering.
        </p>
      </Card>
    </div>
  );
}
