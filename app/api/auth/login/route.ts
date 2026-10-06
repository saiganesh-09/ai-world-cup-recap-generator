import { z } from "zod";
import { apiHandler, ok } from "@/lib/api";
import { verifyPassword, createSession } from "@/lib/auth";
import { userRepo } from "@/repositories/user-repo";
import { UnauthorizedError } from "@/lib/errors";
import { track } from "@/services/analytics";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST = apiHandler(async (req: Request) => {
  const body = loginSchema.parse(await req.json());
  const user = await userRepo.findByEmail(body.email.toLowerCase());
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    throw new UnauthorizedError("Invalid email or password.");
  }
  await createSession(user.id);
  track("login", { userId: user.id });
  return ok({ user: { id: user.id, name: user.name, email: user.email } });
});
