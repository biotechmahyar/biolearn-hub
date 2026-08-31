import { z } from "zod";
import { Context } from "hono";
import { BadRequestError } from "./errors.js";

/**
 * Validate request body against a Zod schema.
 * Throws BadRequestError if validation fails.
 */
export async function validateBody<T extends z.ZodType>(
  c: Context,
  schema: T
): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new BadRequestError("Invalid JSON body");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const messages = result.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    );
    throw new BadRequestError(`Validation error: ${messages.join("; ")}`);
  }
  return result.data;
}

/**
 * Validate query parameters against a Zod schema.
 */
export function validateQuery<T extends z.ZodType>(
  c: Context,
  schema: T
): z.infer<T> {
  const url = new URL(c.req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    params[k] = v;
  });
  const result = schema.safeParse(params);
  if (!result.success) {
    const messages = result.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    );
    throw new BadRequestError(`Invalid query: ${messages.join("; ")}`);
  }
  return result.data;
}

export { z };
