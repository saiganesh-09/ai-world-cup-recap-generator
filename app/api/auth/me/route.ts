import { errorResponse, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return ok({ user: null });
    return ok({
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
