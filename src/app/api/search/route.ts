import { NextResponse } from "next/server";
import { searchArticles } from "@/lib/fts";

/**
 * GET /api/search?q=&limit=
 * Typeahead + programmatic search over published articles only.
 * Architecture §5.3.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const limitRaw = searchParams.get("limit");
    let limit = 10;
    if (limitRaw !== null && limitRaw !== "") {
      const parsed = Number.parseInt(limitRaw, 10);
      if (Number.isFinite(parsed)) {
        limit = Math.min(20, Math.max(1, parsed));
      }
    }

    if (!q) {
      return NextResponse.json({ query: q, results: [] });
    }

    const { query, results } = await searchArticles({ query: q, limit });

    // API shape per architecture: excerpt (not snippet) for typeahead rows
    return NextResponse.json({
      query,
      results: results.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt || stripMarks(r.snippet),
        status: r.status,
        category: r.category,
      })),
    });
  } catch (err) {
    console.error("[api/search] GET failed:", err);
    return NextResponse.json(
      { error: "Search failed. Try again." },
      { status: 500 },
    );
  }
}

function stripMarks(snippet: string): string {
  return snippet.replace(/<\/?mark>/gi, "").trim();
}
