/**
 * Typed application errors. API routes translate these into
 * user-safe HTTP responses; technical details stay server-side.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code = "INTERNAL_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Please sign in to continue.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have access to this resource.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found.`, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request data.") {
    super(message, 422, "VALIDATION_ERROR");
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Please try again later.") {
    super(message, 429, "RATE_LIMITED");
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, detail?: string) {
    super(
      `${service} is temporarily unavailable. Please try again.`,
      502,
      "EXTERNAL_SERVICE_ERROR",
    );
    if (detail) this.message = `${this.message} (${detail})`;
  }
}
