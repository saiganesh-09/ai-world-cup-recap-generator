import { createHash } from "node:crypto";
import OpenAI from "openai";
import { errorResponse, ok } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { env, hasOpenAI } from "@/lib/env";
import { ExternalServiceError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// ── Whisper transcription ───────────────────────────────────
// Accepts an audio file, returns a transcript. Results are cached
// by content hash — the same audio is never transcribed twice.
// Without OPENAI_API_KEY the endpoint returns a clearly-labeled
// demo transcript so the pipeline can be exercised end-to-end.

const MAX_BYTES = 25 * 1024 * 1024; // 25MB Whisper limit

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    rateLimit(`transcribe:${user.id}`, 10, 60 * 60 * 1000);

    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) throw new ValidationError("Missing audio file");
    if (file.size > MAX_BYTES) throw new ValidationError("Audio file too large (max 25MB)");

    const buf = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(buf).digest("hex");

    // Cache hit → return stored transcript.
    const cached = await prisma.transcript.findUnique({ where: { sourceHash: hash } });
    if (cached) {
      return ok({ transcript: cached.text, segments: cached.segments, cached: true });
    }

    if (!hasOpenAI) {
      // Demo-safe behavior without an API key.
      const demo = await prisma.transcript.create({
        data: {
          sourceHash: hash,
          sourceName: file.name,
          language: "en",
          text: "[Demo transcript] Speech-to-text requires OPENAI_API_KEY. This placeholder lets the pipeline run end-to-end without external dependencies.",
          segments: [{ start: 0, end: 5, text: "Demo transcript segment" }],
        },
      });
      return ok({ transcript: demo.text, segments: demo.segments, cached: false, demo: true });
    }

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 120_000 });
    let text: string;
    let segments: unknown = null;
    try {
      const res = await openai.audio.transcriptions.create({
        file: new File([buf], file.name || "audio", { type: file.type || "audio/mpeg" }),
        model: "whisper-1",
        response_format: "verbose_json",
      });
      text = res.text;
      segments = (res as unknown as { segments?: unknown }).segments ?? null;
    } catch (err) {
      throw new ExternalServiceError("Whisper", err instanceof Error ? err.message : undefined);
    }

    await prisma.transcript.create({
      data: { sourceHash: hash, sourceName: file.name, text, segments: segments as object },
    });
    return ok({ transcript: text, segments, cached: false });
  } catch (err) {
    return errorResponse(err);
  }
}
