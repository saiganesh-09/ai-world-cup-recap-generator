import { z } from "zod";
import { created, errorResponse } from "@/lib/api-response";
import { createSession, hashPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email().max(120),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    rateLimit(`signup:${ip}`, 10, 60 * 60 * 1000);

    const { name, email, password } = bodySchema.parse(await req.json());
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse(
        Object.assign(new Error("exists"), {
          statusCode: 409,
          userMessage: "An account with this email already exists.",
          name: "AppError",
        }),
      );
    }
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
    });
    await createSession(user.id);
    return created({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    return errorResponse(err);
  }
}
