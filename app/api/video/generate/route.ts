import { z } from "zod";
import { apiHandler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOwnedRecap, enqueueGeneration } from "@/services/recap/recap-service";
import { createRateLimiter } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";
import { ValidationError } from "@/lib/errors";

const schema = z.object({ recapId: z.string().min(1) });

const limiter = createRateLimiter({
  limit: getEnv().RATE_LIMIT_GENERATE,
  windowMs: 60 * 60 * 1000,
});

/** Re-render the video for an existing recap (e.g. after a failure). */
export const POST = apiHandler(async (req: Request) => {
  const user = await requireUser();
  limiter.check(`generate:${user.id}`);

  const { recapId } = schema.parse(await req.json());
  const recap = await getOwnedRecap(recapId, user.id);
  if (recap.status === "PROCESSING" || recap.status === "QUEUED") {
    throw new ValidationError("A generation is already in progress.");
  }
  const job = await enqueueGeneration(recap);
  return ok({ job }, { status: 202 });
});
