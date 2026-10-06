import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Lightweight product analytics — fire-and-forget event rows.
 * No PII beyond the user FK; props are small JSON blobs.
 */
export function track(
  name:
    | "recap_created"
    | "recap_completed"
    | "recap_failed"
    | "video_played"
    | "recap_shared"
    | "team_selected"
    | "player_selected"
    | "signup"
    | "login",
  props?: { userId?: string; [k: string]: unknown },
): void {
  const { userId, ...rest } = props ?? {};
  void prisma.analyticsEvent
    .create({
      data: {
        name,
        userId: userId ?? null,
        props: (rest as Prisma.InputJsonValue) ?? undefined,
      },
    })
    .catch((err) => console.warn("[analytics] track failed:", err));
}
