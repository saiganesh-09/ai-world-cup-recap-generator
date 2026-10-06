import Link from "next/link";
import { redirect } from "next/navigation";
import { Film, PlusCircle } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { recapRepo } from "@/repositories/recap-repo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Recaps" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "danger"> = {
  COMPLETED: "success",
  PROCESSING: "default",
  QUEUED: "default",
  FAILED: "danger",
  DRAFT: "secondary",
};

export default async function RecapsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { page } = await searchParams;
  const pageNum = Math.max(1, Number(page ?? 1));
  const take = 12;
  const [recaps, total] = await Promise.all([
    recapRepo.listByUser(user.id, { skip: (pageNum - 1) * take, take }),
    recapRepo.countByUser(user.id),
  ]);
  const pages = Math.ceil(total / take);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Recaps</h1>
          <p className="mt-1 text-sm text-muted">
            {total} {total === 1 ? "story" : "stories"} generated
          </p>
        </div>
        <Button asChild>
          <Link href="/create">
            <PlusCircle aria-hidden /> New Recap
          </Link>
        </Button>
      </div>

      {recaps.length === 0 ? (
        <EmptyState
          icon={<Film />}
          title="No recaps yet"
          description="Pick a team or player and let the AI tell their World Cup story."
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
                </div>
                <CardContent className="p-4">
                  <p className="truncate text-sm font-semibold">{r.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {r.tournament.name} · {formatDate(r.createdAt)}
                    {r.durationSec ? ` · ${r.durationSec}s` : ""}
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
            <Link href={`/recaps?page=${pageNum - 1}`}>Previous</Link>
          </Button>
          <span className="text-sm text-muted">
            Page {pageNum} of {pages}
          </span>
          <Button variant="outline" size="sm" asChild disabled={pageNum >= pages}>
            <Link href={`/recaps?page=${pageNum + 1}`}>Next</Link>
          </Button>
        </nav>
      )}
    </div>
  );
}
