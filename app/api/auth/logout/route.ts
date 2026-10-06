import { apiHandler, ok } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export const POST = apiHandler(async () => {
  await destroySession();
  return ok({ ok: true });
});
