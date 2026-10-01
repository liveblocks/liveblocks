import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChannelList } from "@/components/channel-list";
import { getActivityFeedId } from "@/lib/activity";
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
const ACTIVITY = getActivityFeedId(SELF);

function renderList(activeChannelId: string | null = null) {
  const onSelectChannel = vi.fn();
  render(
    <ChannelList
      activeChannelId={activeChannelId}
      onSelectChannel={onSelectChannel}
    />
  );
  return onSelectChannel;
}

describe("ChannelList", () => {
  beforeEach(() => {
    resetMockState({
      selfId: SELF,
      channels: [
        { id: "general", name: "general" },
        { id: "random", name: "random" },
      ],
      feeds: {
        general: mockFeed("general", { type: "channel", name: "general" }),
        random: mockFeed("random", { type: "channel", name: "random" }),
      },
    });
  });

  it("renders channels in state order and selects one", async () => {
    const onSelect = renderList("general");
    const channelButtons = screen
      .getAllByRole("button")
      .filter((button) => /#\s*(general|random)/i.test(button.textContent ?? ""));
    expect(channelButtons.map((button) => button.textContent?.trim())).toEqual([
      "#general",
      "#random",
    ]);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /^#\s*random$/i }));
    expect(onSelect).toHaveBeenCalledWith("random");
  });

  it("adds a trimmed channel and selects its generated id", async () => {
    const user = userEvent.setup();
    const onSelect = renderList();
    await user.click(screen.getByRole("button", { name: "Add channel" }));
    const input = screen.getByPlaceholderText("channel-name");
    await user.type(input, "  launches  {Enter}");
    const added = getMockState().channels.find(
      (channel) => channel.name === "launches"
    );
    expect(added).toBeDefined();
    expect(onSelect).toHaveBeenCalledWith(added!.id);
  });

  it("cancels creation with Escape and ignores blank names", async () => {
    const user = userEvent.setup();
    const onSelect = renderList();
    await user.click(screen.getByRole("button", { name: "Add channel" }));
    await user.type(screen.getByPlaceholderText("channel-name"), "{Escape}");
    expect(screen.queryByPlaceholderText("channel-name")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add channel" }));
    await user.type(screen.getByPlaceholderText("channel-name"), "   {Enter}");
    expect(getMockState().channels).toHaveLength(2);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("renames a channel with Enter and trims the value", async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(screen.getByRole("button", { name: "Rename general" }));
    const input = screen.getByDisplayValue("general");
    await user.clear(input);
    await user.type(input, "  company  {Enter}");
    expect(getMockState().channels[0]).toEqual({
      id: "general",
      name: "company",
    });
  });

  it("cancels rename with Escape", async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(screen.getByRole("button", { name: "Rename general" }));
    const input = screen.getByDisplayValue("general");
    await user.clear(input);
    await user.type(input, "changed{Escape}");
    expect(getMockState().channels[0].name).toBe("general");
  });

  it("deletes a channel and only its thread feeds", async () => {
    resetMockState({
      selfId: SELF,
      channels: [
        { id: "general", name: "general" },
        { id: "random", name: "random" },
      ],
      feeds: {
        general: mockFeed("general", { type: "channel", name: "general" }),
        thread_a: mockFeed("thread_a", {
          type: "thread",
          channelId: "general",
          parentMessageId: "a",
        }),
        thread_b: mockFeed("thread_b", {
          type: "thread",
          channelId: "general",
          parentMessageId: "b",
        }),
        thread_other: mockFeed("thread_other", {
          type: "thread",
          channelId: "random",
          parentMessageId: "c",
        }),
      },
    });
    renderList();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Delete general" }));
    await waitFor(() =>
      expect(getMockState().channels.map((channel) => channel.id)).toEqual([
        "random",
      ])
    );
    expect(liveblocksMocks.deleteFeed).toHaveBeenCalledWith("thread_a");
    expect(liveblocksMocks.deleteFeed).toHaveBeenCalledWith("thread_b");
    expect(liveblocksMocks.deleteFeed).toHaveBeenCalledWith("general");
    expect(liveblocksMocks.deleteFeed).not.toHaveBeenCalledWith("thread_other");
    expect(getMockState().feeds.thread_other).toBeDefined();
  });

  it("counts only unread channel mentions", () => {
    resetMockState({
      selfId: SELF,
      channels: [
        { id: "general", name: "general" },
        { id: "random", name: "random" },
      ],
      feeds: {
        [ACTIVITY]: mockFeed(ACTIVITY, { type: "activity" }),
      },
      messages: {
        [ACTIVITY]: [
          mockMessage({
            kind: "activity",
            type: "mention",
            fromUserId: MISLAV,
            feedId: "general",
            messageId: "m1",
          }),
          mockMessage({
            kind: "activity",
            type: "mention",
            fromUserId: MISLAV,
            feedId: "thread_m1",
            messageId: "r1",
            parentFeedId: "general",
            parentMessageId: "m1",
          }),
          mockMessage({
            kind: "activity",
            type: "thread_reply",
            fromUserId: MISLAV,
            feedId: "thread_m1",
            messageId: "r2",
            parentFeedId: "general",
            parentMessageId: "m1",
          }),
          mockMessage({
            kind: "activity",
            type: "mention",
            fromUserId: MISLAV,
            feedId: "general",
            messageId: "m2",
            readAt: 1,
          }),
        ],
      },
    });
    renderList();
    const generalRow = screen
      .getByRole("button", { name: /^#\s*general$/i })
      .closest("li");
    expect(generalRow).not.toBeNull();
    expect(within(generalRow!).getByLabelText("2 unread")).toBeInTheDocument();
    const randomRow = screen
      .getByRole("button", { name: /^#\s*random$/i })
      .closest("li");
    expect(within(randomRow!).queryByLabelText(/unread/)).not.toBeInTheDocument();
  });
});
