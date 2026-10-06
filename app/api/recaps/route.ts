import { apiHandler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { recapRepo } from "@/repositories/recap-repo";
import { createRecap } from "@/services/recap/recap-service";
import { track } from "@/services/analytics";

export const GET = apiHandler(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const take = 20;
  const [recaps, total] = await Promise.all([
    recapRepo.listByUser(user.id, { skip: (page - 1) * take, take }),
    recapRepo.countByUser(user.id),
  ]);
  return ok({ recaps, total, page, pages: Math.ceil(total / take) });
});

export const POST = apiHandler(async (req: Request) => {
  const user = await requireUser();
  const recap = await createRecap(user.id, await req.json());
  track("recap_created", { userId: user.id, recapId: recap.id, type: recap.type });
  return ok({ recap }, { status: 201 });
});
