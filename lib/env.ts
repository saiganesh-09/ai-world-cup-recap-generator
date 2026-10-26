import { z } from "zod";

// Centralized, validated environment access. Import this instead of
// reading process.env directly so misconfiguration fails fast at boot.

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  SPORTS_API_KEY: z.string().optional().default(""),
  SPORTS_API_BASE_URL: z.string().default("https://v3.football.api-sports.io"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 chars"),
  MEDIA_STORAGE: z.enum(["local", "s3"]).default("local"),
  RATE_LIMIT_RECAPS_PER_HOUR: z.coerce.number().int().positive().default(5),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  SPORTS_API_KEY: process.env.SPORTS_API_KEY,
  SPORTS_API_BASE_URL: process.env.SPORTS_API_BASE_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  AUTH_SECRET:
    process.env.AUTH_SECRET ??
    "insecure-dev-secret-change-me-please",
  MEDIA_STORAGE: process.env.MEDIA_STORAGE,
  RATE_LIMIT_RECAPS_PER_HOUR: process.env.RATE_LIMIT_RECAPS_PER_HOUR,
});

export const hasOpenAI = env.OPENAI_API_KEY.length > 0;
export const hasSportsAPI = env.SPORTS_API_KEY.length > 0;
