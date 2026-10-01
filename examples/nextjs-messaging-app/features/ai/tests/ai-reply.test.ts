// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getActivityFeedId } from "@/lib/feeds";

const {
  LiveblocksMock,
  createFeed,
  createFeedMessage,
  getFeed,
  updateFeed,
  updateFeedMessage,
  streamText,
} = vi.hoisted(() => ({
  LiveblocksMock: vi.fn(),
  createFeed: vi.fn(),
  createFeedMessage: vi.fn(),
  getFeed: vi.fn(),
  updateFeed: vi.fn(),
  updateFeedMessage: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock("@liveblocks/node", () => ({
  Liveblocks: class {
    constructor(options: unknown) {
      LiveblocksMock(options);
    }

    createFeed = createFeed;
    createFeedMessage = createFeedMessage;
    getFeed = getFeed;
    updateFeed = updateFeed;
    updateFeedMessage = updateFeedMessage;
  },
}));

vi.mock("ai", () => ({
  streamText,
}));

import { POST } from "@/features/ai/api/ai-reply";

const ROOM_ID = "liveblocks:examples:nextjs-messaging-app:demo";

function aiReplyRequest(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/ai-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/ai-reply", () => {
  beforeEach(() => {
    createFeed.mockResolvedValue({});
    createFeedMessage.mockResolvedValue({
      id: "ai-msg-1",
      data: { content: "" },
    });
    getFeed.mockResolvedValue({ metadata: {} });
    updateFeed.mockResolvedValue({});
    updateFeedMessage.mockResolvedValue({});
    vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "sk_test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 403 when LIVEBLOCKS_SECRET_KEY is missing", async () => {
    vi.stubEnv("LIVEBLOCKS_SECRET_KEY", "");
    const response = await aiReplyRequest({
      roomId: ROOM_ID,
      feedId: "general",
      messages: [],
    });
    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe(
      "Missing LIVEBLOCKS_SECRET_KEY"
    );
    expect(LiveblocksMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-object body", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/ai-reply", {
        method: "POST",
        body: JSON.stringify("x"),
      })
    );
    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Invalid request");
  });

  it("returns 400 for invalid room or missing feedId", async () => {
    let response = await aiReplyRequest({
      roomId: "other:room",
      feedId: "general",
      messages: [],
    });
    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Invalid room or feed");

    response = await aiReplyRequest({
      roomId: ROOM_ID,
      feedId: "",
      messages: [],
    });
    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Invalid room or feed");
  });

  it("streams a mock channel reply and updates the message", async () => {
    const response = await aiReplyRequest({
      roomId: ROOM_ID,
      feedId: "general",
      messages: [
        {
          userId: "charlie.layne@example.com",
          content: "hi <@ai-assistant>",
        },
      ],
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });

    expect(createFeed).toHaveBeenCalledWith({
      roomId: ROOM_ID,
      feedId: "general",
      metadata: { name: "general", type: "channel" },
    });
    expect(createFeedMessage).toHaveBeenCalledWith({
      roomId: ROOM_ID,
      feedId: "general",
      data: {
        userId: "ai-assistant",
        content: "",
        streaming: true,
      },
    });
    expect(getFeed).not.toHaveBeenCalled();

    expect(updateFeedMessage.mock.calls.length).toBeGreaterThanOrEqual(2);
    for (const call of updateFeedMessage.mock.calls.slice(0, -1)) {
      expect(call[0]).toMatchObject({
        roomId: ROOM_ID,
        feedId: "general",
        messageId: "ai-msg-1",
        data: expect.objectContaining({ streaming: true }),
      });
    }
    const lastCall =
      updateFeedMessage.mock.calls[updateFeedMessage.mock.calls.length - 1][0];
    expect(lastCall).toMatchObject({
      messageId: "ai-msg-1",
      data: expect.objectContaining({ streaming: false }),
    });
    expect(lastCall.data.content).toMatch(/mock reply/i);
    expect(lastCall.data.content).toContain("hi @Liveblocks AI");
  }, 10_000);

  it("still succeeds when createFeed rejects because the feed exists", async () => {
    createFeed.mockRejectedValueOnce(new Error("exists"));
    const response = await aiReplyRequest({
      roomId: ROOM_ID,
      feedId: "general",
      messages: [],
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  }, 10_000);

  it("creates a DM feed with dm metadata", async () => {
    await aiReplyRequest({
      roomId: ROOM_ID,
      feedId: "dm_a__b",
      messages: [],
    });
    expect(createFeed).toHaveBeenCalledWith({
      roomId: ROOM_ID,
      feedId: "dm_a__b",
      metadata: { type: "dm" },
    });
  }, 10_000);

  it("updates thread metadata and writes activity items for participants", async () => {
    getFeed.mockResolvedValue({
      metadata: {
        type: "thread",
        channelId: "general",
        parentMessageId: "m1",
        replyCount: "2",
        participantIds: ["charlie.layne@example.com"],
      },
    });

    await aiReplyRequest({
      roomId: ROOM_ID,
      feedId: "thread_m1",
      messages: [
        {
          userId: "charlie.layne@example.com",
          content: "<@mislav.abha@example.com> thoughts? <@ai-assistant>",
        },
      ],
    });

    expect(createFeed).not.toHaveBeenCalledWith(
      expect.objectContaining({ feedId: "general" })
    );
    expect(getFeed).toHaveBeenCalledWith({
      roomId: ROOM_ID,
      feedId: "thread_m1",
    });
    expect(updateFeed).toHaveBeenCalledWith({
      roomId: ROOM_ID,
      feedId: "thread_m1",
      metadata: expect.objectContaining({
        replyCount: "3",
        participantIds: expect.arrayContaining([
          "charlie.layne@example.com",
          "ai-assistant",
        ]),
      }),
    });

    const charlieActivity = getActivityFeedId("charlie.layne@example.com");
    const mislavActivity = getActivityFeedId("mislav.abha@example.com");

    expect(createFeed).toHaveBeenCalledWith({
      roomId: ROOM_ID,
      feedId: charlieActivity,
      metadata: { type: "activity" },
    });
    expect(createFeed).toHaveBeenCalledWith({
      roomId: ROOM_ID,
      feedId: mislavActivity,
      metadata: { type: "activity" },
    });
    expect(createFeed).not.toHaveBeenCalledWith(
      expect.objectContaining({
        feedId: getActivityFeedId("ai-assistant"),
      })
    );

    const activityMessages = createFeedMessage.mock.calls.filter((call) =>
      call[0].feedId.startsWith("activity_")
    );
    expect(activityMessages).toHaveLength(2);
    for (const [args] of activityMessages) {
      expect(args.data).toEqual({
        kind: "activity",
        type: "thread_reply",
        fromUserId: "ai-assistant",
        feedId: "thread_m1",
        messageId: "ai-msg-1",
        parentFeedId: "general",
        parentMessageId: "m1",
      });
    }
  }, 10_000);

  it("does not create activity feeds for unknown users in thread history", async () => {
    getFeed.mockResolvedValue({
      metadata: {
        type: "thread",
        channelId: "general",
        parentMessageId: "m1",
        replyCount: "0",
        participantIds: [],
      },
    });

    await aiReplyRequest({
      roomId: ROOM_ID,
      feedId: "thread_m1",
      messages: [
        {
          userId: "nobody@example.com",
          content: "hello",
        },
      ],
    });

    const activityCreates = createFeed.mock.calls.filter((call) =>
      String(call[0].feedId).startsWith("activity_")
    );
    expect(activityCreates).toHaveLength(0);
  }, 10_000);

  it("still succeeds when getFeed rejects on a thread feed", async () => {
    getFeed.mockRejectedValue(new Error("missing"));
    const response = await aiReplyRequest({
      roomId: ROOM_ID,
      feedId: "thread_m1",
      messages: [],
    });
    expect(response.status).toBe(200);
    const lastCall =
      updateFeedMessage.mock.calls[updateFeedMessage.mock.calls.length - 1][0];
    expect(lastCall.data.streaming).toBe(false);
  }, 10_000);

  it("skips activity messages when thread metadata lacks parent pointers", async () => {
    getFeed.mockResolvedValue({
      metadata: {
        type: "thread",
        replyCount: "1",
        participantIds: ["charlie.layne@example.com"],
      },
    });

    await aiReplyRequest({
      roomId: ROOM_ID,
      feedId: "thread_m1",
      messages: [
        {
          userId: "charlie.layne@example.com",
          content: "<@mislav.abha@example.com>",
        },
      ],
    });

    expect(updateFeed).toHaveBeenCalled();
    const activityMessages = createFeedMessage.mock.calls.filter((call) =>
      call[0].feedId.startsWith("activity_")
    );
    expect(activityMessages).toHaveLength(0);
    expect(createFeedMessage).toHaveBeenCalledTimes(1);
  }, 10_000);

  it("writes an error message when updateFeedMessage fails during streaming", async () => {
    updateFeedMessage
      .mockRejectedValueOnce(new Error("stream failed"))
      .mockResolvedValue({});

    const response = await aiReplyRequest({
      roomId: ROOM_ID,
      feedId: "general",
      messages: [],
    });

    expect(response.status).toBe(200);
    const lastCall =
      updateFeedMessage.mock.calls[updateFeedMessage.mock.calls.length - 1][0];
    expect(lastCall.data.streaming).toBe(false);
    expect(lastCall.data.content).toContain("Sorry, something went wrong");
  }, 10_000);
});
