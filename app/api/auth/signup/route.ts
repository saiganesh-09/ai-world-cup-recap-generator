import { z } from "zod";
import { apiHandler, ok } from "@/lib/api";
import { hashPassword, createSession } from "@/lib/auth";
import { userRepo } from "@/repositories/user-repo";
import { ValidationError } from "@/lib/errors";
import { track } from "@/services/analytics";

const signupSchema = z.object({
  name: z.string().min(2, "Name is too short").max(60),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export const POST = apiHandler(async (req: Request) => {
  const body = signupSchema.parse(await req.json());

  const existing = await userRepo.findByEmail(body.email.toLowerCase());
  if (existing) throw new ValidationError("An account with this email already exists.");

  const user = await userRepo.create({
    email: body.email.toLowerCase(),
    name: body.name,
    passwordHash: await hashPassword(body.password),
  });
  await createSession(user.id);
  track("signup", { userId: user.id });

  return ok({ user: { id: user.id, name: user.name, email: user.email } }, { status: 201 });
});
