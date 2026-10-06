import OpenAI from "openai";
import { writeFile, unlink } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getEnv, hasOpenAI } from "@/lib/env";
import { ExternalServiceError, ValidationError } from "@/lib/errors";

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

let client: OpenAI | null = null;

const MAX_FILE_BYTES = 20 * 1024 * 1024; // Whisper API limit is ~25MB
const ALLOWED_MIME = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/m4a",
  "audio/mp4",
  "audio/webm",
  "audio/ogg",
];

/**
 * Speech-to-text via OpenAI Whisper.
 *
 * Results are persisted as Transcript rows keyed on (matchId, source)
 * so the same audio is never transcribed twice.
 */
export async function transcribeAudio(input: {
  bytes: Buffer;
  filename: string;
  mimeType: string;
  matchId?: string;
}): Promise<{ transcriptId: string; segments: TranscriptSegment[] }> {
  if (!hasOpenAI()) {
    throw new ExternalServiceError(
      "Transcription",
      "OPENAI_API_KEY is not configured",
    );
  }
  if (input.bytes.length === 0 || input.bytes.length > MAX_FILE_BYTES) {
    throw new ValidationError("Audio file must be between 1 byte and 20MB.");
  }
  if (input.mimeType && !ALLOWED_MIME.includes(input.mimeType)) {
    throw new ValidationError(`Unsupported audio type: ${input.mimeType}`);
  }

  const source = `${input.filename}:${input.bytes.length}`;

  // Transcription cache — same file + same match never re-processed.
  const existing = await prisma.transcript.findFirst({
    where: { matchId: input.matchId ?? null, source },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return {
      transcriptId: existing.id,
      segments: existing.segments as unknown as TranscriptSegment[],
    };
  }

  client ??= new OpenAI({ apiKey: getEnv().OPENAI_API_KEY });

  // Write to a temp file (Whisper API needs a file/stream)
  const tmpDir = path.join(os.tmpdir(), "wc-transcribe");
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `${Date.now()}-${input.filename}`);
  await writeFile(tmpFile, input.bytes);

  try {
    const { createReadStream } = await import("node:fs");
    const res = await client.audio.transcriptions.create({
      model: getEnv().OPENAI_WHISPER_MODEL,
      file: createReadStream(tmpFile),
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    const segments: TranscriptSegment[] =
      (res as unknown as { segments?: { start: number; end: number; text: string }[] })
        .segments?.map((s) => ({
          start: s.start,
          end: s.end,
          text: s.text.trim(),
        })) ?? [{ start: 0, end: 0, text: res.text }];

    const transcript = await prisma.transcript.create({
      data: {
        matchId: input.matchId ?? null,
        source,
        language: (res as unknown as { language?: string }).language ?? "en",
        segments: segments as unknown as object[],
      },
    });
    return { transcriptId: transcript.id, segments };
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ExternalServiceError)
      throw err;
    throw new ExternalServiceError(
      "Transcription",
      err instanceof Error ? err.message : "unknown error",
    );
  } finally {
    await unlink(tmpFile).catch(() => {});
  }
}

/**
 * Aligns transcript segments to match events — commentary mentions that
 * fall near an event's minute-mark become the moment's "commentary".
 * 60 seconds of audio ≈ 1 match minute (commentary is real-time).
 */
export function alignSegmentsToEvents(
  segments: TranscriptSegment[],
  eventMinutes: number[],
): { minute: number; text: string }[] {
  return eventMinutes.map((minute) => {
    const lo = minute * 60;
    const hi = lo + 60;
    const hit = segments.find((s) => s.start >= lo && s.start < hi);
    return {
      minute,
      text: hit?.text ?? "",
    };
  });
}
