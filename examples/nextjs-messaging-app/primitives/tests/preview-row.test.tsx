import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { getUser } from "@/lib/database";
import type { ChatMessage } from "@/lib/feeds";
import {
  MessagePreview,
  PreviewRow,
  PreviewSkeleton,
  UnreadDot,
} from "@/primitives/preview-row";

function chatMessage(
  id: string,
  overrides: Partial<ChatMessage["data"]> = {}
): ChatMessage {
  return {
    id,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    data: {
      userId: "charlie.layne@example.com",
      content: "hello world",
      ...overrides,
    },
  };
}

describe("PreviewRow", () => {
  it("renders title, time, and children", () => {
    const user = getUser("charlie.layne@example.com");
    if (!user) throw new Error("expected fixture user");

    render(
      <PreviewRow
        active={false}
        unread={false}
        user={user}
        title="General"
        time={1_700_000_000_000}
        onOpen={vi.fn()}
      >
        Latest message
      </PreviewRow>
    );

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Latest message")).toBeInTheDocument();
    expect(document.querySelector("time")).toBeInTheDocument();
  });

  it("calls onOpen when clicked", async () => {
    const user = getUser("charlie.layne@example.com");
    if (!user) throw new Error("expected fixture user");
    const onOpen = vi.fn();

    render(
      <PreviewRow
        active={false}
        unread={false}
        user={user}
        title="General"
        onOpen={onOpen}
      >
        Preview
      </PreviewRow>
    );

    await userEvent.setup().click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("sets aria-current when active", () => {
    const user = getUser("charlie.layne@example.com");
    if (!user) throw new Error("expected fixture user");
    const { rerender } = render(
      <PreviewRow
        active
        unread={false}
        user={user}
        title="General"
        onOpen={vi.fn()}
      >
        Preview
      </PreviewRow>
    );

    expect(screen.getByRole("button")).toHaveAttribute("aria-current", "true");

    rerender(
      <PreviewRow
        active={false}
        unread={false}
        user={user}
        title="General"
        onOpen={vi.fn()}
      >
        Preview
      </PreviewRow>
    );
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-current");
  });

  it("shows indicator only when unread", () => {
    const user = getUser("charlie.layne@example.com");
    if (!user) throw new Error("expected fixture user");
    const { rerender } = render(
      <PreviewRow
        active={false}
        unread
        user={user}
        title="General"
        indicator={<span>dot</span>}
        onOpen={vi.fn()}
      >
        Preview
      </PreviewRow>
    );
    expect(screen.getByText("dot")).toBeInTheDocument();

    rerender(
      <PreviewRow
        active={false}
        unread={false}
        user={user}
        title="General"
        indicator={<span>dot</span>}
        onOpen={vi.fn()}
      >
        Preview
      </PreviewRow>
    );
    expect(screen.queryByText("dot")).not.toBeInTheDocument();
  });
});

describe("MessagePreview", () => {
  it("shows Thinking when streaming without content", () => {
    const message = chatMessage("m1", { content: "", streaming: true });
    render(<MessagePreview message={message} />);
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
  });

  it("renders message content when available", () => {
    const message = chatMessage("m2", { content: "Hello there" });
    render(<MessagePreview message={message} />);
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });
});

describe("UnreadDot", () => {
  it("renders an unread dot", () => {
    const { container } = render(<UnreadDot />);
    const dot = container.querySelector("span");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("size-2", "rounded-full", "bg-brand-500");
    expect(dot).toHaveAttribute("aria-hidden");
  });
});

describe("PreviewSkeleton", () => {
  it("renders a skeleton placeholder", () => {
    const { container } = render(<PreviewSkeleton />);
    const skeleton = container.querySelector("span");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass("animate-pulse");
  });
});
