import { z } from "zod";
import { apiHandler, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { track } from "@/services/analytics";

const schema = z.object({
  name: z.enum([
    "recap_created",
    "recap_completed",
    "video_played",
    "recap_shared",
    "team_selected",
    "player_selected",
  ]),
  props: z.record(z.string(), z.unknown()).optional(),
});

/** Client-side event beacon. No PII — just product events. */
export const POST = apiHandler(async (req: Request) => {
  const user = await getSessionUser();
  const body = schema.parse(await req.json());
  track(body.name, { ...body.props, userId: user?.id });
  return ok({ ok: true });
});
