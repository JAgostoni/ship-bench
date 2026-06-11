import { NextResponse } from "next/server";
import { z } from "zod";

const MAX_BODY_BYTES = 100 * 1024;

export type ApiError = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
};

export function errorResponse(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } },
    { status },
  );
}

export function validationError(error: z.ZodError): NextResponse<ApiError> {
  const { fieldErrors } = z.flattenError(error);
  return errorResponse(400, "VALIDATION", "Invalid article", fieldErrors);
}

export function notFound(id: string | number): NextResponse<ApiError> {
  return errorResponse(404, "NOT_FOUND", `Article ${id} not found`);
}

export function unexpectedError(error: unknown): NextResponse<ApiError> {
  console.error("Unexpected API error:", error);
  return errorResponse(500, "INTERNAL", "Unexpected server error");
}

/**
 * Read a JSON request body, enforcing the 100 KB cap (architecture §3).
 * Oversized or malformed bodies yield a ready-to-return 400 response.
 */
export async function readJsonBody(
  request: Request,
): Promise<
  { ok: true; data: unknown } | { ok: false; response: NextResponse<ApiError> }
> {
  let text: string;
  try {
    text = await request.text();
  } catch (error) {
    console.error("Failed to read request body:", error);
    return {
      ok: false,
      response: errorResponse(
        400,
        "VALIDATION",
        "Request body could not be read",
      ),
    };
  }

  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: errorResponse(
        400,
        "VALIDATION",
        "Request body must be 100 KB or smaller",
      ),
    };
  }

  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      response: errorResponse(
        400,
        "VALIDATION",
        "Request body must be valid JSON",
      ),
    };
  }
}

/** Parse a route `id` param; null for anything that is not a plain integer. */
export function parseArticleId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}
