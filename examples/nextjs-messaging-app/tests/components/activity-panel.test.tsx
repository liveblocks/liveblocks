import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityPanel } from "@/components/activity-panel";
import { getActivityFeedId } from "@/lib/activity";
import { getDmFeedId } from "@/lib/conversations";
import {
  getMockState,
  liveblocksMocks,
  mockFeed,
  mockMessage,
  resetMockState,
  setMockState,
} from "../helpers/liveblocks-mock";

vi.mock("@liveblocks/react/suspense", () => import("../helpers/liveblocks-mock"));
vi.mock("@liveblocks/react", () => import("../helpers/liveblocks-mock"));

const SELF = "charlie.layne@example.com";
const MISLAV = "mislav.abha@example.com";
const TATUM = "tatum.paolo@example.com";
const ACTIVITY = getActivityFeedId(SELF);
const DM = getDmFeedId(SELF, MISLAV);

function activityData(
  type: "mention" | "dm" | "thread_reply",
  overrides: Record<string, unknown> = {}
) {
  return {
    kind: "activity" as const,
    type,
    fromUserId: type === "thread_reply" ? TATUM : MISLAV,
    feedId: type === "mention" ? "general" : type === "dm" ? DM : "thread_m1",
    messageId: type === "mention" ? "m1" : type === "dm" ? "d1" : "r1",
    ...(type === "thread_reply"
      ? { parentFeedId: "general", parentMessageId: "m1" }
      : {}),
    ...overrides,
  };
}

function seed(items = [
  mockMessage(activityData("mention"), { id: "a1", createdAt: 300 }),
  mockMessage(activityData("dm"), { id: "a2", createdAt: 200 }),
  mockMessage(activityData("thread_reply", { readAt: 1 }), {
    id: "a3",
    createdAt: 100,
  }),
]) {
  resetMockState({
    selfId: SELF,
    channels: [{ id: "general", name: "general" }],
    feeds: {
      [ACTIVITY]: mockFeed(ACTIVITY, { type: "activity" }),
      general: mockFeed("general", { type: "channel", name: "general" }),
      [DM]: mockFeed(DM, {
        type: "dm",
        participantIds: [SELF, MISLAV].sort(),
      }),
      thread_m1: mockFeed("thread_m1", {
        type: "thread",
        channelId: "general",
        parentMessageId: "m1",
      }),
    },
    messages: {
      [ACTIVITY]: items,
      general: [
        mockMessage(
          { userId: MISLAV, content: `hello <@${SELF}>` },
          { id: "m1" }
        ),
      ],
      [DM]: [mockMessage({ userId: MISLAV, content: "psst" }, { id: "d1" })],
      thread_m1: [
        mockMessage({ userId: TATUM, content: "reply text" }, { id: "r1" }),
      ],
    },
  });
}

function renderPanel(activeItemId: string | null = null) {
  const onNavigate = vi.fn();
  render(<ActivityPanel activeItemId={activeItemId} onNavigate={onNavigate} />);
  return onNavigate;
}

describe("ActivityPanel", () => {
  beforeEach(() => seed());

  it("shows its empty state", () => {
    seed([]);
    renderPanel();
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("renders newest-first descriptions and referenced previews", () => {
    renderPanel();
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Mislav Abha mentioned you in #general");
    expect(rows[0]).toHaveTextContent("hello @Charlie Layne");
    expect(rows[1]).toHaveTextContent(
      "Mislav Abha sent you a direct message"
    );
    expect(rows[1]).toHaveTextContent("psst");
    expect(rows[2]).toHaveTextContent(
      "Tatum Paolo replied in a thread in #general"
    );
    expect(rows[2]).toHaveTextContent("reply text");
  });

  it("describes thread mentions, deleted channels, and DM thread locations", () => {
    seed();
    setMockState({
      feeds: {
        ...getMockState().feeds,
        "dm-thread": mockFeed("dm-thread", {
          type: "thread",
          channelId: DM,
          parentMessageId: "d1",
        }),
      },
      messages: {
        ...getMockState().messages,
        [ACTIVITY]: [
      mockMessage(
        activityData("mention", {
          feedId: "thread_m1",
          parentFeedId: "general",
          parentMessageId: "m1",
          messageId: "r1",
        }),
        { id: "thread-mention" }
      ),
      mockMessage(
        activityData("mention", { feedId: "gone", messageId: "gone-message" }),
        { id: "deleted-channel" }
      ),
      mockMessage(
        activityData("mention", {
          feedId: "dm-thread",
          parentFeedId: DM,
          parentMessageId: "d1",
          messageId: "dm-reply",
        }),
        { id: "dm-mention" }
      ),
        ],
        gone: [
          mockMessage({ userId: MISLAV, content: "gone preview" }, {
            id: "gone-message",
          }),
        ],
        "dm-thread": [
          mockMessage({ userId: MISLAV, content: "dm reply" }, {
            id: "dm-reply",
          }),
        ],
      },
    });
    renderPanel();
    expect(
      screen.getByText(/mentioned you in a thread in #general/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/mentioned you in a deleted channel/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/mentioned you in a thread in your conversation/i)
    ).toBeInTheDocument();
  });

  it("navigates to channel, DM, and thread targets", async () => {
    const user = userEvent.setup();
    const onNavigate = renderPanel();
    await user.click(
      screen.getByRole("button", { name: /mentioned you in #general/i })
    );
    expect(onNavigate).toHaveBeenLastCalledWith({
      itemId: "a1",
      selection: { type: "channel", channelId: "general" },
      threadMessageId: null,
      highlight: { feedId: "general", messageId: "m1" },
    });
    await user.click(
      screen.getByRole("button", { name: /sent you a direct message/i })
    );
    expect(onNavigate).toHaveBeenLastCalledWith({
      itemId: "a2",
      selection: { type: "dm", userId: MISLAV },
      threadMessageId: null,
      highlight: { feedId: DM, messageId: "d1" },
    });
    await user.click(
      screen.getByRole("button", { name: /replied in a thread/i })
    );
    expect(onNavigate).toHaveBeenLastCalledWith({
      itemId: "a3",
      selection: { type: "channel", channelId: "general" },
      threadMessageId: "m1",
      highlight: { feedId: "thread_m1", messageId: "r1" },
    });
  });

  it("falls back to fromUserId when DM participant metadata is absent", async () => {
    seed();
    resetMockState({
      selfId: SELF,
      channels: [{ id: "general", name: "general" }],
      feeds: {
        [ACTIVITY]: mockFeed(ACTIVITY, { type: "activity" }),
        [DM]: mockFeed(DM, { type: "dm" }),
      },
      messages: {
        [ACTIVITY]: [
          mockMessage(activityData("dm"), { id: "activity-dm" }),
        ],
        [DM]: [
          mockMessage({ userId: MISLAV, content: "psst" }, { id: "d1" }),
        ],
      },
    });
    const onNavigate = renderPanel();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /direct message/i }));
    expect(onNavigate.mock.calls[0][0].selection).toEqual({
      type: "dm",
      userId: MISLAV,
    });
  });

  it("marks all unread items read and removes the control", async () => {
    renderPanel();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Mark all as read" }));
    await waitFor(() =>
      expect(liveblocksMocks.updateFeedMessage).toHaveBeenCalledTimes(2)
    );
    for (const call of liveblocksMocks.updateFeedMessage.mock.calls) {
      expect(call[0]).toBe(ACTIVITY);
      expect(call[2]).toEqual(expect.objectContaining({ readAt: expect.any(Number) }));
    }
    expect(
      screen.queryByRole("button", { name: "Mark all as read" })
    ).not.toBeInTheDocument();
  });

  it("marks only one row read and marks the active row", async () => {
    renderPanel("a1");
    const active = screen.getByRole("button", {
      name: /mentioned you in #general/i,
    });
    expect(active).toHaveAttribute("aria-current", "true");
    const row = active.closest("li");
    expect(row).not.toBeNull();
    await userEvent
      .setup()
      .click(within(row!).getByRole("button", { name: "Mark as read" }));
    expect(liveblocksMocks.updateFeedMessage).toHaveBeenCalledTimes(1);
    expect(liveblocksMocks.updateFeedMessage).toHaveBeenCalledWith(
      ACTIVITY,
      "a1",
      expect.objectContaining({ readAt: expect.any(Number) })
    );
  });

  it("dismisses activity for a deleted referenced message", async () => {
    seed([
      mockMessage(activityData("mention", { messageId: "missing" }), {
        id: "missing-item",
      }),
    ]);
    renderPanel();
    await waitFor(() =>
      expect(liveblocksMocks.deleteFeedMessage).toHaveBeenCalledWith(
        ACTIVITY,
        "missing-item"
      )
    );
    expect(screen.queryByText(/mentioned you/i)).not.toBeInTheDocument();
  });

  it("pages for an unloaded referenced message without dismissing it", async () => {
    seed([
      mockMessage(activityData("mention", { messageId: "missing" }), {
        id: "missing-item",
      }),
    ]);
    setMockState({ hasFetchedAll: { general: false } });
    renderPanel();
    await waitFor(() => expect(liveblocksMocks.fetchMore).toHaveBeenCalled());
    expect(screen.getByText(/mentioned you/i)).toBeInTheDocument();
    expect(liveblocksMocks.deleteFeedMessage).not.toHaveBeenCalled();
  });

  it("shows errors and streaming placeholders", () => {
    seed([
      mockMessage(activityData("mention"), { id: "error-item" }),
      mockMessage(activityData("dm"), { id: "stream-item" }),
    ]);
    setMockState({
      errors: { general: new Error("nope") },
      messages: {
        ...getMockState().messages,
        [DM]: [
          mockMessage(
            { userId: MISLAV, content: "", streaming: true },
            { id: "d1" }
          ),
        ],
      },
    });
    renderPanel();
    expect(screen.getByText("Message unavailable")).toBeInTheDocument();
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
  });

  it("loads older activity", async () => {
    setMockState({ hasFetchedAll: { [ACTIVITY]: false } });
    renderPanel();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Load older activity" }));
    expect(liveblocksMocks.fetchMore).toHaveBeenCalled();
  });
});
