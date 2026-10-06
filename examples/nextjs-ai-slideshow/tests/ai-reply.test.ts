import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_USER_ID } from "@/app/database";

type UpdatePayload = Record<string, unknown>;

const lb = vi.hoisted(() => ({
  updateCalls: [] as UpdatePayload[],
  createFeed: vi.fn(async () => undefined),
  createFeedMessage: vi.fn(async () => ({
    id: "m1",
    data: { content: "" },
  })),
  updateFeedMessage: vi.fn(async (_args: { data: UpdatePayload }) => {
    lb.updateCalls.push(_args.data);
  }),
}));

vi.mock("@liveblocks/node", () => ({
  Liveblocks: class MockLiveblocks {
    createFeed = lb.createFeed;
    createFeedMessage = lb.createFeedMessage;
    updateFeedMessage = lb.updateFeedMessage;
  },
}));

import { POST } from "@/app/api/ai-reply/route";

const ROOM = "liveblocks:examples:nextjs-ai-slideshow:ai";

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/ai-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  lb.updateCalls.length = 0;
  lb.createFeed.mockClear();
  lb.createFeedMessage.mockClear();
  lb.updateFeedMessage.mockClear();
  process.env.LIVEBLOCKS_SECRET_KEY = "sk_test";
  delete process.env.AI_GATEWAY_API_KEY;
});

afterEach(() => {
  delete process.env.LIVEBLOCKS_SECRET_KEY;
});

describe("POST /api/ai-reply mock mode", () => {
  it("returns 400 for room id outside the prefix or missing feedId", async () => {
    expect(
      (
        await post({
          roomId: "other",
          feedId: "f",
          messages: [],
          slides: [],
          currentSlideId: "initial",
        })
      ).status
    ).toBe(400);
    expect(
      (
        await post({
          roomId: ROOM,
          feedId: "",
          messages: [],
          slides: [],
          currentSlideId: "initial",
        })
      ).status
    ).toBe(400);
  });

  it("returns 400 when slides in the body is not an array", async () => {
    const response = await post({
      roomId: ROOM,
      feedId: "f",
      messages: [],
      slides: "nope",
      currentSlideId: "initial",
    });
    expect(response.status).toBe(400);
  });

  it("streams a mock assistant reply with one proposal suggestions and assistant author fields", async () => {
    const lastUser = "Make it about teamwork";
    const response = await post({
      roomId: ROOM,
      feedId: "feed-1",
      messages: [{ role: "user", content: lastUser }],
      slides: [{ id: "deck-slide", html: "<p>x</p>" }],
      currentSlideId: "deck-slide",
    });

    expect(response.status).toBe(200);
    expect(lb.createFeed).toHaveBeenCalled();
    expect(lb.createFeedMessage).toHaveBeenCalled();

    const finalUpdate = lb.updateCalls.at(-1);
    expect(finalUpdate).toBeDefined();
    expect(finalUpdate?.streaming).toBe(false);
    expect(finalUpdate?.proposalStatus).toBe("pending");
    expect(finalUpdate?.role).toBe("assistant");
    expect(finalUpdate?.userId).toBe(AI_USER_ID);

    const proposals = finalUpdate?.proposals as
      { slideId: string; html: string }[] | undefined;
    expect(proposals).toHaveLength(1);
    expect(proposals?.[0]?.slideId).toBe("deck-slide");
    expect(proposals?.[0]?.html.length).toBeGreaterThan(0);

    const content = String(finalUpdate?.content ?? "");
    expect(content).toContain(lastUser);

    const suggestions = finalUpdate?.suggestions as string[] | undefined;
    expect(suggestions).toHaveLength(3);

    for (const call of lb.updateCalls) {
      expect(call.role).toBe("assistant");
      expect(call.userId).toBe("ai-assistant");
    }
  }, 20_000);
});
