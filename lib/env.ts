import { z } from "zod";

/**
 * Server-side environment validation.
 * Anything the browser may see must be prefixed NEXT_PUBLIC_.
 * Optional AI/sports keys: the app runs in demo mode without them.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  OPENAI_API_KEY: z.string().default(""),
  OPENAI_TEXT_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_TTS_MODEL: z.string().default("gpt-4o-mini-tts"),
  OPENAI_WHISPER_MODEL: z.string().default("whisper-1"),

  SPORTS_API_KEY: z.string().default(""),
  SPORTS_API_BASE_URL: z.string().default("https://v3.football.api-sports.io"),
  SPORTS_API_LEAGUE_ID: z.string().default("1"),
  SPORTS_API_SEASON: z.string().default("2022"),

  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),

  RATE_LIMIT_GENERATE: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_TRANSCRIBE: z.coerce.number().int().positive().default(10),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid environment: ${parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`,
      );
    }
    cached = parsed.data;
  }
  return cached;
}

export const hasOpenAI = () => getEnv().OPENAI_API_KEY.length > 0;
export const hasSportsApi = () => getEnv().SPORTS_API_KEY.length > 0;
