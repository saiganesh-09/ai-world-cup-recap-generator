import { z } from "zod";
import { errorResponse, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED = new Set([
  "recap_created",
  "recap_completed",
  "video_played",
  "recap_shared",
  "team_selected",
  "player_selected",
  "page_view",
]);

const schema = z.object({
  event: z.string().max(60),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Lightweight product analytics — allowlisted event names only.
export async function POST(req: Request) {
  try {
    const { event, metadata } = schema.parse(await req.json());
    if (!ALLOWED.has(event)) return ok({ ignored: true });
    const user = await getCurrentUser();
    await prisma.analyticsEvent.create({
      data: { userId: user?.id ?? null, event, metadata: metadata as object },
    });
    return ok({ tracked: true });
  } catch (err) {
    return errorResponse(err);
  }
}
