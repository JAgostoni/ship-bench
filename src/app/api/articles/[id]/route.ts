import { NextResponse } from "next/server";
import {
  notFound,
  parseArticleId,
  readJsonBody,
  unexpectedError,
  validationError,
} from "@/lib/api/http";
import { deleteArticle, getArticle, updateArticle } from "@/lib/repo/articles";
import { articleInput } from "@/lib/validation/article";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: rawId } = await context.params;
    const id = parseArticleId(rawId);
    if (id === null) {
      return notFound(rawId);
    }

    const article = getArticle(id);
    if (!article) {
      return notFound(id);
    }
    return NextResponse.json({ article });
  } catch (error) {
    return unexpectedError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id: rawId } = await context.params;
    const id = parseArticleId(rawId);
    if (id === null) {
      return notFound(rawId);
    }

    const body = await readJsonBody(request);
    if (!body.ok) {
      return body.response;
    }

    const parsed = articleInput.safeParse(body.data);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const article = updateArticle(id, parsed.data);
    if (!article) {
      return notFound(id);
    }
    return NextResponse.json({ article });
  } catch (error) {
    return unexpectedError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id: rawId } = await context.params;
    const id = parseArticleId(rawId);
    if (id === null) {
      return notFound(rawId);
    }

    if (!deleteArticle(id)) {
      return notFound(id);
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    return unexpectedError(error);
  }
}
