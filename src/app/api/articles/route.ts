import { NextResponse } from "next/server";
import { readJsonBody, unexpectedError, validationError } from "@/lib/api/http";
import { createArticle, listArticles } from "@/lib/repo/articles";
import { articleInput } from "@/lib/validation/article";

export async function GET() {
  try {
    return NextResponse.json({ articles: listArticles() });
  } catch (error) {
    return unexpectedError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    if (!body.ok) {
      return body.response;
    }

    const parsed = articleInput.safeParse(body.data);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const article = createArticle(parsed.data);
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    return unexpectedError(error);
  }
}
