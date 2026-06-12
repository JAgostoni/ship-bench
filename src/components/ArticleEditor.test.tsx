// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ArticleEditor } from "./ArticleEditor";

// The editor only navigates after a successful save; none of these tests
// reach the network, so a inert router is enough.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderNewEditor() {
  return render(<ArticleEditor mode="new" heading={<h1>New article</h1>} />);
}

describe("ArticleEditor", () => {
  it("shows 'Title is required' wired to the input on submit with an empty title", () => {
    const { container } = renderNewEditor();
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    const input = screen.getByLabelText("Title");
    expect(input.getAttribute("aria-invalid")).toBe("true");

    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const message = document.getElementById(describedBy!);
    expect(message?.textContent).toContain("Title is required");
  });

  it("renders typed Markdown in the preview pane after the 150 ms debounce", () => {
    vi.useFakeTimers();
    renderNewEditor();

    expect(screen.getByText("Nothing to preview yet.")).toBeDefined();

    fireEvent.change(screen.getByLabelText("Content"), {
      target: { value: "# Hello" },
    });
    // Still the previous preview before the debounce elapses.
    expect(
      screen.queryByRole("heading", { level: 1, name: "Hello" }),
    ).toBeNull();

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(
      screen.getByRole("heading", { level: 1, name: "Hello" }),
    ).toBeDefined();
    expect(screen.queryByText("Nothing to preview yet.")).toBeNull();
  });

  it("clears a blur-shown error as soon as the field is fixed", () => {
    renderNewEditor();
    const input = screen.getByLabelText("Title");

    fireEvent.blur(input, { target: { value: "" } });
    expect(screen.getByText("Title is required")).toBeDefined();
    expect(input.getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(input, { target: { value: "Deploy checklist" } });
    expect(screen.queryByText("Title is required")).toBeNull();
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });
});
