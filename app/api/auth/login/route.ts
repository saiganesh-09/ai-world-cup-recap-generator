import { z } from "zod";
import { errorResponse, ok } from "@/lib/api-response";
import { createSession, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    rateLimit(`login:${ip}`, 15, 15 * 60 * 1000); // brute-force protection

    const { email, password } = bodySchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email } });
    // Same error for missing user vs bad password — no enumeration.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return errorResponse(
        Object.assign(new Error("bad credentials"), {
          statusCode: 401,
          userMessage: "Incorrect email or password.",
          name: "AppError",
        }),
      );
    }
    await createSession(user.id);
    return ok({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    return errorResponse(err);
  }
}
