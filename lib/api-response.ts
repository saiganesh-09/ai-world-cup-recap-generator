import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, RateLimitError } from "./errors";

// Consistent API envelope: { data } on success, { error } on failure.

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: { message: "Invalid request data.", issues: err.flatten() } },
      { status: 400 },
    );
  }
  if (err instanceof RateLimitError) {
    return NextResponse.json(
      { error: { message: err.userMessage } },
      { status: 429, headers: { "Retry-After": String(err.retryAfterSec) } },
    );
  }
  if (err instanceof AppError) {
    console.error(`[${err.name}] ${err.message}`);
    return NextResponse.json(
      { error: { message: err.userMessage } },
      { status: err.statusCode },
    );
  }
  console.error("[UnhandledError]", err);
  return NextResponse.json(
    { error: { message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}
