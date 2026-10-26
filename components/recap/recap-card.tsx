import Link from "next/link";
import { Clock, Film } from "lucide-react";
import { Badge, Card, TeamCrest } from "@/components/ui/primitives";
import type { RecapStatus } from "@prisma/client";

const STATUS_COLOR: Record<RecapStatus, "green" | "sky" | "red" | "slate"> = {
  READY: "green",
  GENERATING: "sky",
  FAILED: "red",
  DRAFT: "slate",
};

export interface RecapCardData {
  id: string;
  title: string;
  status: RecapStatus;
  durationSec: number | null;
  thumbnailUrl: string | null;
  createdAt: string | Date;
  team: { name: string; shortName: string; primaryColor: string } | null;
  tournament: { name: string; year: number };
  job?: { status: string; progress: number } | null;
}

export function RecapCard({ recap }: { recap: RecapCardData }) {
  return (
    <Link href={`/recaps/${recap.id}`}>
      <Card hover className="overflow-hidden">
        <div className="relative h-36 bg-gradient-to-br from-surface-2 to-surface flex items-center justify-center">
          {recap.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recap.thumbnailUrl} alt={`${recap.title} thumbnail`} className="h-full w-full object-cover" />
          ) : (
            <Film size={32} className="text-slate-600" />
          )}
          <div className="absolute right-2 top-2">
            <Badge color={STATUS_COLOR[recap.status]}>
              {recap.status === "GENERATING"
                ? `Generating ${recap.job?.progress ?? 0}%`
                : recap.status.toLowerCase()}
            </Badge>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2">
            {recap.team && <TeamCrest short={recap.team.shortName} color={recap.team.primaryColor} size={22} />}
            <h3 className="truncate font-semibold">{recap.title}</h3>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{recap.tournament.name}</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {recap.durationSec ? `${recap.durationSec}s` : "—"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {new Date(recap.createdAt).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            })}
          </p>
        </div>
      </Card>
    </Link>
  );
}
