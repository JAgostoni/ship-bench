import { afterEach, describe, expect, it, vi } from "vitest";
import { setupInMemoryDb } from "@/lib/test/db";
import {
  createArticle,
  deleteArticle,
  getArticle,
  listArticles,
  updateArticle,
} from "./articles";

setupInMemoryDb();

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createArticle / getArticle", () => {
  it("round-trips a created article", () => {
    const created = createArticle({
      title: "Deploy checklist",
      content: "# Steps",
    });

    expect(created.id).toBeGreaterThan(0);
    expect(created.title).toBe("Deploy checklist");
    expect(created.content).toBe("# Steps");
    expect(created.createdAt).toBe(created.updatedAt);

    expect(getArticle(created.id)).toEqual(created);
  });

  it("returns null for a missing id", () => {
    expect(getArticle(999)).toBeNull();
  });
});

describe("updateArticle", () => {
  it("updates fields and bumps updatedAt without touching createdAt", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    const created = createArticle({ title: "Before", content: "old" });

    vi.spyOn(Date, "now").mockReturnValue(2_000_000);
    const updated = updateArticle(created.id, {
      title: "After",
      content: "new",
    });

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe("After");
    expect(updated?.content).toBe("new");
    expect(updated?.createdAt).toBe(1_000_000);
    expect(updated?.updatedAt).toBe(2_000_000);
  });

  it("returns null for a missing id", () => {
    expect(updateArticle(999, { title: "x", content: "y" })).toBeNull();
  });
});

describe("deleteArticle", () => {
  it("deletes an existing row and reports true", () => {
    const created = createArticle({ title: "Doomed", content: "bye" });

    expect(deleteArticle(created.id)).toBe(true);
    expect(getArticle(created.id)).toBeNull();
  });

  it("returns false for a missing id", () => {
    expect(deleteArticle(999)).toBe(false);
  });
});

describe("listArticles", () => {
  it("orders by updatedAt DESC and omits content", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const oldest = createArticle({ title: "Oldest", content: "a" });

    vi.spyOn(Date, "now").mockReturnValue(3_000);
    const newest = createArticle({ title: "Newest", content: "b" });

    vi.spyOn(Date, "now").mockReturnValue(2_000);
    const middle = createArticle({ title: "Middle", content: "c" });

    const list = listArticles();

    expect(list.map((a) => a.id)).toEqual([newest.id, middle.id, oldest.id]);
    expect(list[0]).toEqual({
      id: newest.id,
      title: "Newest",
      updatedAt: 3_000,
    });
    for (const item of list) {
      expect(item).not.toHaveProperty("content");
    }
  });

  it("returns an empty array when there are no articles", () => {
    expect(listArticles()).toEqual([]);
  });
});
