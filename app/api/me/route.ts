import { apiHandler, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export const GET = apiHandler(async () => {
  const user = await getSessionUser();
  if (!user) return ok({ user: null });
  return ok({
    user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
  });
});
