import type { z } from "zod";

/** An error that is safe to show the client as-is. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, "NOT_FOUND", `${what} not found.`);
export const forbidden = (message = "You do not have access to this action.") =>
  new HttpError(403, "FORBIDDEN", message);
export const conflict = (message: string) => new HttpError(409, "CONFLICT", message);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Route ids that aren't UUIDs can't exist, so treat them as not found. */
export function idParam(value: unknown, what: string): string {
  if (typeof value !== "string" || !UUID.test(value)) throw notFound(what);
  return value;
}

export function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((i) => i.path.join(".") || "body"))];
    throw new HttpError(400, "VALIDATION_ERROR", `Invalid fields: ${fields.join(", ")}`);
  }
  return result.data;
}
