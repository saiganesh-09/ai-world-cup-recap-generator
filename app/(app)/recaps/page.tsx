import type { Metadata } from "next";
import { RecapCard } from "@/components/recap/recap-card";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { recapRepo } from "@/repositories/recap.repository";
import { Video } from "lucide-react";

export const metadata: Metadata = { title: "My Recaps" };

export default async function RecapsPage() {
  const user = await requireUser();
  const recaps = await recapRepo.forUser(user.id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Recaps</h1>
          <p className="mt-1 text-sm text-muted">{recaps.length} recap{recaps.length === 1 ? "" : "s"} generated</p>
        </div>
        <ButtonLink href="/create" size="sm">New recap</ButtonLink>
      </div>

      {recaps.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 text-slate-500">
            <Video size={30} />
          </div>
          <h2 className="mt-4 font-semibold">No recaps yet</h2>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Pick a team and generate your first personalized World Cup story.
          </p>
          <ButtonLink href="/create" className="mt-6">Create My Recap</ButtonLink>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recaps.map((r) => (
            <RecapCard key={r.id} recap={r} />
          ))}
        </div>
      )}
    </div>
  );
}
