import { apiHandler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deleteOwnedRecap, getOwnedRecap } from "@/services/recap/recap-service";

export const GET = apiHandler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const user = await requireUser();
    const recap = await getOwnedRecap(id, user.id);
    return ok({ recap });
  },
);

export const DELETE = apiHandler(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const user = await requireUser();
    await deleteOwnedRecap(id, user.id);
    return ok({ ok: true });
  },
);
