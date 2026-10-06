import { apiHandler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { transcribeAudio } from "@/services/transcription/whisper";
import { createRateLimiter } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";
import { ValidationError } from "@/lib/errors";

const limiter = createRateLimiter({
  limit: getEnv().RATE_LIMIT_TRANSCRIBE,
  windowMs: 60 * 60 * 1000,
});

export const POST = apiHandler(async (req: Request) => {
  const user = await requireUser();
  limiter.check(`transcribe:${user.id}`);

  const form = await req.formData();
  const file = form.get("audio");
  const matchId = form.get("matchId");
  if (!(file instanceof File)) {
    throw new ValidationError("Attach an audio file in the 'audio' field.");
  }

  const result = await transcribeAudio({
    bytes: Buffer.from(await file.arrayBuffer()),
    filename: file.name || "audio",
    mimeType: file.type,
    matchId: typeof matchId === "string" ? matchId : undefined,
  });
  return ok(result, { status: 201 });
});
