import { apiHandler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOwnedRecap, enqueueGeneration } from "@/services/recap/recap-service";
import { createRateLimiter } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";

const limiter = createRateLimiter({
  limit: getEnv().RATE_LIMIT_GENERATE,
  windowMs: 60 * 60 * 1000, // per hour
});

export const POST = apiHandler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const user = await requireUser();
    limiter.check(`generate:${user.id}`);

    const recap = await getOwnedRecap(id, user.id);
    const job = await enqueueGeneration(recap);
    return ok({ job }, { status: 202 });
  },
);
