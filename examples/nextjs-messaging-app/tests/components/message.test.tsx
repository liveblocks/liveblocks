import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Message } from "@/components/message";
import { isChatMessage, type ChatMessageData } from "@/lib/activity";
import {
  getMockState,
  liveblocksMocks,
  mockFeed,
  mockMessage,
  resetMockState,
} from "../helpers/liveblocks-mock";

vi.mock("@liveblocks/react/suspense", () => import("../helpers/liveblocks-mock"));
vi.mock("@liveblocks/react", () => import("../helpers/liveblocks-mock"));

const SELF = "charlie.layne@example.com";
const MISLAV = "mislav.abha@example.com";

function seedMessage(
  data: ChatMessageData = {
    userId: MISLAV,
    content: "hello",
  }
) {
  const message = mockMessage(data, { id: "m1", createdAt: 1_700_000_000_000 });
  resetMockState({
    selfId: SELF,
    feeds: {
      general: mockFeed("general", { type: "channel", name: "general" }),
    },
    messages: { general: [message] },
  });
  return message;
}

describe("Message", () => {
  beforeEach(() => {
    seedMessage();
  });

  it("shows author and time only with a header", () => {
    const message = seedMessage();
    const { rerender } = render(
      <Message message={message} feedId="general" showHeader />
    );
    expect(screen.getByText("Mislav Abha")).toBeInTheDocument();
    expect(screen.getByRole("time")).toBeInTheDocument();

    rerender(<Message message={message} feedId="general" showHeader={false} />);
    expect(screen.queryByText("Mislav Abha")).not.toBeInTheDocument();
    expect(screen.queryByRole("time")).not.toBeInTheDocument();
  });

  it("renders markdown content", () => {
    const message = seedMessage({ userId: MISLAV, content: "**bold**" });
    render(<Message message={message} feedId="general" showHeader />);
    expect(screen.getByText("bold").tagName).toBe("STRONG");
  });

  it("applies the highlight background only when highlighted", () => {
    const message = seedMessage();
    const { container, rerender } = render(
      <Message
        message={message}
        feedId="general"
        showHeader
        highlighted
      />
    );
    expect(container.querySelector('[data-message-id="m1"]')).toHaveClass(
      "bg-yellow-50"
    );
    rerender(<Message message={message} feedId="general" showHeader />);
    expect(container.querySelector('[data-message-id="m1"]')).not.toHaveClass(
      "bg-yellow-50"
    );
  });

  it("shows Thinking and no reaction button while streaming", () => {
    const message = seedMessage({
      userId: MISLAV,
      content: "",
      streaming: true,
    });
    render(<Message message={message} feedId="general" showHeader />);
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add reaction" })
    ).not.toBeInTheDocument();
  });

  it("allows only an own channel message to be deleted", async () => {
    const own = seedMessage({ userId: SELF, content: "mine" });
    const thread = mockFeed("thread_m1", {
      type: "thread",
      channelId: "general",
      parentMessageId: "m1",
    });
    resetMockState({
      selfId: SELF,
      feeds: {
        general: mockFeed("general", { type: "channel", name: "general" }),
        thread_m1: thread,
      },
      messages: { general: [own] },
    });
    render(
      <Message
        message={own}
        feedId="general"
        showHeader
        threadFeed={thread}
      />
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Delete message" }));
    await waitFor(() =>
      expect(liveblocksMocks.deleteFeedMessage).toHaveBeenCalledWith(
        "general",
        "m1"
      )
    );
    expect(liveblocksMocks.deleteFeed).toHaveBeenCalledWith("thread_m1");
  });

  it("hides delete for someone else and delegates to onDelete", async () => {
    const other = seedMessage();
    const { rerender } = render(
      <Message message={other} feedId="general" showHeader />
    );
    expect(
      screen.queryByRole("button", { name: "Delete message" })
    ).not.toBeInTheDocument();

    const own = seedMessage({ userId: SELF, content: "mine" });
    const onDelete = vi.fn();
    rerender(
      <Message
        message={own}
        feedId="general"
        showHeader
        onDelete={onDelete}
      />
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Delete message" }));
    expect(onDelete).toHaveBeenCalled();
    expect(liveblocksMocks.deleteFeedMessage).not.toHaveBeenCalled();
  });

  it("offers thread replies only in channel messages", async () => {
    const message = seedMessage();
    const onOpenThread = vi.fn();
    const { rerender } = render(
      <Message
        message={message}
        feedId="general"
        showHeader
        onOpenThread={onOpenThread}
      />
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Reply in thread" }));
    expect(onOpenThread).toHaveBeenCalled();
    rerender(
      <Message
        message={message}
        feedId="general"
        showHeader
        variant="thread"
        onOpenThread={onOpenThread}
      />
    );
    expect(
      screen.queryByRole("button", { name: "Reply in thread" })
    ).not.toBeInTheDocument();
  });

  it.each([
    ["2", "2 replies"],
    ["1", "1 reply"],
  ])("shows a %s-reply thread pill", async (replyCount, label) => {
    const message = seedMessage();
    const onOpenThread = vi.fn();
    const thread = mockFeed("thread_m1", {
      type: "thread",
      channelId: "general",
      parentMessageId: "m1",
      replyCount,
      participantIds: [MISLAV],
    });
    render(
      <Message
        message={message}
        feedId="general"
        showHeader
        threadFeed={thread}
        onOpenThread={onOpenThread}
      />
    );
    await userEvent.setup().click(screen.getByRole("button", { name: new RegExp(label) }));
    expect(onOpenThread).toHaveBeenCalled();
  });

  it("hides a zero-reply thread pill", () => {
    const message = seedMessage();
    const thread = mockFeed("thread_m1", {
      type: "thread",
      channelId: "general",
      parentMessageId: "m1",
      replyCount: "0",
    });
    render(
      <Message
        message={message}
        feedId="general"
        showHeader
        threadFeed={thread}
        onOpenThread={vi.fn()}
      />
    );
    expect(screen.queryByText(/repl(y|ies)/)).not.toBeInTheDocument();
  });

  it("adds and removes the current user's reaction", async () => {
    const message = seedMessage({
      userId: MISLAV,
      content: "react",
      reactions: [{ emoji: "👍", userId: MISLAV, createdAt: 100 }],
    });
    const props = { feedId: "general", showHeader: true };
    const { rerender } = render(<Message message={message} {...props} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /👍 1/ }));
    expect(liveblocksMocks.updateFeedMessage).toHaveBeenLastCalledWith(
      "general",
      "m1",
      expect.objectContaining({
        reactions: expect.arrayContaining([
          expect.objectContaining({ emoji: "👍", userId: SELF }),
        ]),
      })
    );
    const updated = getMockState().messages.general[0];
    if (!isChatMessage(updated)) throw new Error("expected a chat message");
    rerender(<Message message={updated} {...props} />);
    expect(screen.getByRole("button", { name: /👍 2/ })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: /👍 2/ }));
    expect(
      liveblocksMocks.updateFeedMessage.mock.calls.at(-1)?.[2].reactions
    ).toEqual([{ emoji: "👍", userId: MISLAV, createdAt: 100 }]);
  });
});
