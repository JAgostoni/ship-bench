// One pass over the REST contract via Playwright's request fixture — the
// cheap integration check the REST-over-Server-Actions decision bought us
// (architecture decision #6). Self-contained: creates and deletes its own row.
import { expect, test } from "@playwright/test";

type ArticleBody = {
  article: {
    id: number;
    title: string;
    content: string;
    createdAt: number;
    updatedAt: number;
  };
};

test("API contract: create → get → put → delete → 404", async ({ request }) => {
  // Create.
  const created = await request.post("/api/articles", {
    data: { title: "API contract check", content: "Body v1" },
  });
  expect(created.status()).toBe(201);
  const { article } = (await created.json()) as ArticleBody;
  expect(article.title).toBe("API contract check");
  expect(article.content).toBe("Body v1");
  expect(article.createdAt).toBe(article.updatedAt);

  // Get.
  const fetched = await request.get(`/api/articles/${article.id}`);
  expect(fetched.status()).toBe(200);
  expect(((await fetched.json()) as ArticleBody).article).toEqual(article);

  // Put.
  const updated = await request.put(`/api/articles/${article.id}`, {
    data: { title: "API contract check v2", content: "Body v2" },
  });
  expect(updated.status()).toBe(200);
  const updatedArticle = ((await updated.json()) as ArticleBody).article;
  expect(updatedArticle.title).toBe("API contract check v2");
  expect(updatedArticle.updatedAt).toBeGreaterThanOrEqual(article.updatedAt);

  // Delete.
  const deleted = await request.delete(`/api/articles/${article.id}`);
  expect(deleted.status()).toBe(204);

  // 404 with the error contract.
  const missing = await request.get(`/api/articles/${article.id}`);
  expect(missing.status()).toBe(404);
  const body = (await missing.json()) as { error: { code: string } };
  expect(body.error.code).toBe("NOT_FOUND");
});

test("API validation errors follow the error contract", async ({ request }) => {
  const res = await request.post("/api/articles", {
    data: { title: "", content: "" },
  });
  expect(res.status()).toBe(400);
  const body = (await res.json()) as {
    error: { code: string; fieldErrors?: Record<string, string[]> };
  };
  expect(body.error.code).toBe("VALIDATION");
  expect(body.error.fieldErrors?.title).toContain("Title is required");
  expect(body.error.fieldErrors?.content).toContain("Content is required");
});
