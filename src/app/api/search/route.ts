import { NextRequest, NextResponse } from "next/server";
import { unexpectedError } from "@/lib/api/http";
import { SEARCH_LIMIT_DEFAULT, searchArticles } from "@/lib/repo/articles";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const rawLimit = request.nextUrl.searchParams.get("limit");
    const parsedLimit = rawLimit === null ? NaN : Number.parseInt(rawLimit, 10);
    const limit = Number.isFinite(parsedLimit)
      ? parsedLimit
      : SEARCH_LIMIT_DEFAULT;

    // Blank/whitespace q (and queries with no usable terms) come back as
    // 200 with empty results — never an error (iteration brief, task 2.4).
    return NextResponse.json(searchArticles(q, limit));
  } catch (error) {
    return unexpectedError(error);
  }
}
