import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHENTICATED: "Please log in to continue.",
  FORBIDDEN: "Sorry, you can't do that.",
  NOT_FOUND: "We couldn't find that.",
  VALIDATION: "Please check the highlighted fields.",
  CONFLICT: "Someone got there first. Please pick another time.",
  RATE_LIMITED: "Too many tries. Please wait a few minutes and try again.",
  INTERNAL: "Something went wrong on our side. Please try again.",
};

export type FieldErrors = Record<string, string[] | undefined>;

/** An error that is safe to show the user: a code plus a short, friendly message. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fieldErrors?: FieldErrors;

  constructor(code: ErrorCode, message = DEFAULT_MESSAGES[code], fieldErrors?: FieldErrors) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** What every server action returns. Actions never throw raw errors to the browser. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; fieldErrors?: FieldErrors };

/**
 * Runs an action body and turns thrown errors into an ActionResult.
 * Next.js redirect() and notFound() still propagate.
 */
export async function runAction<T>(body: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await body() };
  } catch (error) {
    unstable_rethrow(error);
    return toErrorResult(error);
  }
}

export function toErrorResult(error: unknown): ActionResult<never> {
  if (error instanceof AppError) {
    return {
      ok: false,
      code: error.code,
      message: error.message,
      ...(error.fieldErrors && { fieldErrors: error.fieldErrors }),
    };
  }
  // Details go to the server log (Sentry once monitoring ships), never to the user.
  console.error(error);
  const cause = error instanceof Error && error.cause;
  const causeMsg = cause instanceof Error ? cause.message : cause ? String(cause) : "";
  const detail = causeMsg
    ? `${error instanceof Error ? error.message : String(error)} [${causeMsg}]`
    : error instanceof Error
      ? error.message
      : String(error);
  return {
    ok: false,
    code: "INTERNAL",
    message:
      process.env.NODE_ENV === "development"
        ? `${DEFAULT_MESSAGES.INTERNAL} (${detail})`
        : DEFAULT_MESSAGES.INTERNAL,
  };
}

/**
 * Parses action input with a feature's Zod schema. Build schemas with
 * z.strictObject() so unknown fields are rejected.
 */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError("VALIDATION", undefined, z.flattenError(result.error).fieldErrors);
  }
  return result.data;
}
