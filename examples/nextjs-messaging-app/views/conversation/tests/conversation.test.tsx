import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AI_USER, getUser } from "@/lib/database";
import { ConversationView } from "@/views/conversation";
import { getActivityFeedId } from "@/lib/feeds";
import { getDmFeedId } from "@/lib/feeds";
import {
  liveblocksMocks,
  mockFeed,
  mockMessage,
  resetMockState,
} from "@/tests/helpers/liveblocks-mock";

vi.mock(
  "@liveblocks/react/suspense",
  () => import("@/tests/helpers/liveblocks-mock")
);
vi.mock("@liveblocks/react", () => import("@/tests/helpers/liveblocks-mock"));

const SELF = "charlie.layne@example.com";
const MISLAV = "mislav.abha@example.com";
const ACTIVITY = getActivityFeedId(SELF);
const channelConversation = {
  type: "channel" as const,
  feedId: "general",
  channel: { id: "general", name: "general" },
};

describe("ConversationView", () => {
  beforeEach(() => {
    resetMockState({ selfId: SELF, channels: [channelConversation.channel] });
  });

  it("shows channel and DM headers with presence", () => {
    const onOpenThread = vi.fn();
    const { rerender } = render(
      <ConversationView
        conversation={channelConversation}
        openThreadMessageId={null}
        onOpenThread={onOpenThread}
      />
    );
    expect(
      screen.getByRole("heading", { name: "#general" })
    ).toBeInTheDocument();

    const mislav = getUser(MISLAV)!;
    rerender(
      <ConversationView
        conversation={{
          type: "dm",
          feedId: getDmFeedId(SELF, MISLAV),
          user: mislav,
        }}
        openThreadMessageId={null}
        onOpenThread={onOpenThread}
      />
    );
    expect(
      screen.getByRole("heading", { name: "Mislav Abha", level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();

    rerender(
      <ConversationView
        conversation={{
          type: "dm",
          feedId: getDmFeedId(SELF, AI_USER.id),
          user: AI_USER,
        }}
        openThreadMessageId={null}
        onOpenThread={onOpenThread}
      />
    );
    expect(screen.getByText("Agent")).toBeInTheDocument();
    expect(screen.getByLabelText("Online")).toBeInTheDocument();
  });

  it("ensures channel and sorted-participant DM feeds", async () => {
    const onOpenThread = vi.fn();
    const { unmount } = render(
      <ConversationView
        conversation={channelConversation}
        openThreadMessageId={null}
        onOpenThread={onOpenThread}
      />
    );
    await waitFor(() =>
      expect(liveblocksMocks.createFeed).toHaveBeenCalledWith("general", {
        metadata: { name: "general", type: "channel" },
      })
    );
    unmount();

    resetMockState({ selfId: SELF });
    const dmFeedId = getDmFeedId(SELF, MISLAV);
    render(
      <ConversationView
        conversation={{ type: "dm", feedId: dmFeedId, user: getUser(MISLAV)! }}
        openThreadMessageId={null}
        onOpenThread={onOpenThread}
      />
    );
    await waitFor(() =>
      expect(liveblocksMocks.createFeed).toHaveBeenCalledWith(dmFeedId, {
        metadata: { type: "dm", participantIds: [SELF, MISLAV].sort() },
      })
    );
  });

  it("tolerates ensuring an existing feed", async () => {
    resetMockState({
      selfId: SELF,
      feeds: {
        general: mockFeed("general", { type: "channel", name: "general" }),
      },
    });
    render(
      <ConversationView
        conversation={channelConversation}
        openThreadMessageId={null}
        onOpenThread={vi.fn()}
      />
    );
    await waitFor(() =>
      expect(liveblocksMocks.createFeed).toHaveBeenCalledWith(
        "general",
        expect.anything()
      )
    );
    expect(screen.getByText("Welcome to #general")).toBeInTheDocument();
  });

  it("marks top-level activity read, then marks the opened thread", async () => {
    resetMockState({
      selfId: SELF,
      channels: [channelConversation.channel],
      feeds: {
        general: mockFeed("general", { type: "channel", name: "general" }),
        [ACTIVITY]: mockFeed(ACTIVITY, { type: "activity" }),
      },
      messages: {
        general: [
          mockMessage({ userId: MISLAV, content: "root" }, { id: "m1" }),
        ],
        [ACTIVITY]: [
          mockMessage(
            {
              kind: "activity",
              type: "mention",
              fromUserId: MISLAV,
              feedId: "general",
              messageId: "m1",
            },
            { id: "top" }
          ),
          mockMessage(
            {
              kind: "activity",
              type: "thread_reply",
              fromUserId: MISLAV,
              feedId: "thread_m1",
              messageId: "r1",
              parentFeedId: "general",
              parentMessageId: "m1",
            },
            { id: "thread" }
          ),
          mockMessage(
            {
              kind: "activity",
              type: "mention",
              fromUserId: MISLAV,
              feedId: "random",
              messageId: "other",
            },
            { id: "other" }
          ),
        ],
      },
    });
    const onOpenThread = vi.fn();
    const { rerender } = render(
      <ConversationView
        conversation={channelConversation}
        openThreadMessageId={null}
        onOpenThread={onOpenThread}
      />
    );
    await waitFor(() =>
      expect(liveblocksMocks.updateFeedMessage).toHaveBeenCalledWith(
        ACTIVITY,
        "top",
        expect.objectContaining({ readAt: expect.any(Number) })
      )
    );
    expect(liveblocksMocks.updateFeedMessage).not.toHaveBeenCalledWith(
      ACTIVITY,
      "thread",
      expect.anything()
    );
    rerender(
      <ConversationView
        conversation={channelConversation}
        openThreadMessageId="m1"
        onOpenThread={onOpenThread}
      />
    );
    await waitFor(() =>
      expect(liveblocksMocks.updateFeedMessage).toHaveBeenCalledWith(
        ACTIVITY,
        "thread",
        expect.objectContaining({ readAt: expect.any(Number) })
      )
    );
    expect(liveblocksMocks.updateFeedMessage).not.toHaveBeenCalledWith(
      ACTIVITY,
      "other",
      expect.anything()
    );
  });

  it("renders feed messages and the channel introduction", () => {
    resetMockState({
      selfId: SELF,
      feeds: {
        general: mockFeed("general", { type: "channel", name: "general" }),
      },
      messages: {
        general: [
          mockMessage({ userId: MISLAV, content: "first message" }),
          mockMessage({ userId: SELF, content: "second message" }),
        ],
      },
    });
    render(
      <ConversationView
        conversation={channelConversation}
        openThreadMessageId={null}
        onOpenThread={vi.fn()}
      />
    );
    expect(screen.getByText("first message")).toBeInTheDocument();
    expect(screen.getByText("second message")).toBeInTheDocument();
    expect(screen.getByText("Welcome to #general")).toBeInTheDocument();
  });

  it("opens and closes a thread, and closes a missing parent automatically", async () => {
    resetMockState({
      selfId: SELF,
      feeds: {
        general: mockFeed("general", { type: "channel", name: "general" }),
      },
      messages: {
        general: [
          mockMessage({ userId: MISLAV, content: "thread me" }, { id: "m1" }),
        ],
      },
    });
    const user = userEvent.setup();
    const onOpenThread = vi.fn();
    const { rerender } = render(
      <ConversationView
        conversation={channelConversation}
        openThreadMessageId={null}
        onOpenThread={onOpenThread}
      />
    );
    await user.click(screen.getByRole("button", { name: "Reply in thread" }));
    expect(onOpenThread).toHaveBeenCalledWith("m1");

    rerender(
      <ConversationView
        conversation={channelConversation}
        openThreadMessageId="m1"
        onOpenThread={onOpenThread}
      />
    );
    expect(screen.getByRole("heading", { name: "Thread" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close thread" }));
    expect(onOpenThread).toHaveBeenCalledWith(null);

    onOpenThread.mockClear();
    rerender(
      <ConversationView
        conversation={channelConversation}
        openThreadMessageId="missing"
        onOpenThread={onOpenThread}
      />
    );
    await waitFor(() => expect(onOpenThread).toHaveBeenCalledWith(null));
  });
});
