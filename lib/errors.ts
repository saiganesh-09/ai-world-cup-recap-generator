// Typed application errors. Route handlers map these to HTTP
// responses via `errorResponse` — internal details are logged,
// never leaked to clients.

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public userMessage = "Something went wrong. Please try again.",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, `We couldn't find that ${resource.toLowerCase()}.`);
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super("Unauthorized", 401, "Please sign in to continue.");
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super("Forbidden", 403, "You don't have access to this resource.");
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public issues?: unknown,
  ) {
    super(message, 400, "Some of the information provided isn't valid.");
  }
}

export class RateLimitError extends AppError {
  constructor(public retryAfterSec: number) {
    super("Rate limit exceeded", 429, "You're doing that too fast. Please wait a moment and try again.");
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, detail?: string) {
    super(
      `${service} failed${detail ? `: ${detail}` : ""}`,
      502,
      "An external service is temporarily unavailable. Please try again shortly.",
    );
  }
}
