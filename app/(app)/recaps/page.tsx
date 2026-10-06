import Link from "next/link";
import { redirect } from "next/navigation";
import { Film, PlusCircle, Globe, Timer } from "lucide-react";
import type { RecapStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { recapRepo } from "@/repositories/recap-repo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Flag } from "@/components/flag";
import { formatDate, RECAP_TYPE_LABELS, TONE_LABELS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Recaps" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "danger"> = {
  COMPLETED: "success",
  PROCESSING: "default",
  QUEUED: "default",
  FAILED: "danger",
  DRAFT: "secondary",
};

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "COMPLETED", label: "Completed" },
  { key: "PROCESSING", label: "In progress" },
  { key: "DRAFT", label: "Drafts" },
  { key: "FAILED", label: "Failed" },
];

export default async function RecapsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { page, status } = await searchParams;
  const pageNum = Math.max(1, Number(page ?? 1));
  const statusFilter =
    status && status !== "all" ? (status as RecapStatus) : undefined;
  const take = 12;
  const [recaps, total] = await Promise.all([
    recapRepo.listByUser(user.id, {
      skip: (pageNum - 1) * take,
      take,
      status: statusFilter,
    }),
    recapRepo.countByUser(user.id, statusFilter),
  ]);
  const pages = Math.ceil(total / take);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Recaps</h1>
          <p className="mt-1 text-sm text-muted">
            {total} {total === 1 ? "story" : "stories"}
            {statusFilter ? ` · ${statusFilter.toLowerCase()}` : " generated"}
          </p>
        </div>
        <Button asChild>
          <Link href="/create">
            <PlusCircle aria-hidden /> New Recap
          </Link>
        </Button>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Status filter">
        {STATUS_TABS.map((t) => {
          const active = (status ?? "all") === t.key;
          return (
            <Link
              key={t.key}
              href={`/recaps${t.key === "all" ? "" : `?status=${t.key}`}`}
              aria-pressed={active}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:border-accent/40 hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {recaps.length === 0 ? (
        <EmptyState
          icon={<Film />}
          title={statusFilter ? "No recaps in this state" : "No recaps yet"}
          description={
            statusFilter
              ? "Try a different filter, or generate something new."
              : "Pick a team or player and let the AI tell their World Cup story."
          }
          action={
            <Button asChild>
              <Link href="/create">Create My Recap</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recaps.map((r) => (
            <Link key={r.id} href={`/recaps/${r.id}`} className="card-hover block">
              <Card className="h-full overflow-hidden">
                <div className="relative aspect-video bg-surface-2">
                  {r.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.thumbnailUrl}
                      alt={`${r.title} thumbnail`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted">
                      <Film className="size-8" aria-hidden />
                    </div>
                  )}
                  <Badge
                    variant={STATUS_VARIANT[r.status]}
                    className="absolute right-3 top-3"
                  >
                    {r.status}
                  </Badge>
                  {r.isPublic && (
                    <span
                      className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white"
                      title="Public — share link enabled"
                    >
                      <Globe className="size-3" aria-hidden /> Shared
                    </span>
                  )}
                  {r.durationSec != null && (
                    <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      <Timer className="size-3" aria-hidden />
                      {Math.floor(r.durationSec / 60)}:
                      {String(r.durationSec % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {RECAP_TYPE_LABELS[r.type] ?? r.type}
                    </Badge>
                    {r.tone && (
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                        {TONE_LABELS[r.tone] ?? r.tone}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm font-semibold">{r.title}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    {r.team && (
                      <Flag code={r.team.shortName} name={r.team.name} />
                    )}
                    {r.team?.name ?? r.player?.name ?? r.tournament.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(r.createdAt)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Pagination">
          <Button variant="outline" size="sm" asChild disabled={pageNum <= 1}>
            <Link
              href={`/recaps?page=${pageNum - 1}${status ? `&status=${status}` : ""}`}
            >
              Previous
            </Link>
          </Button>
          <span className="text-sm text-muted">
            Page {pageNum} of {pages}
          </span>
          <Button variant="outline" size="sm" asChild disabled={pageNum >= pages}>
            <Link
              href={`/recaps?page=${pageNum + 1}${status ? `&status=${status}` : ""}`}
            >
              Next
            </Link>
          </Button>
        </nav>
      )}
    </div>
  );
}
