import { NextRequest } from "next/server";
import * as Y from "yjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSlideIds, getSlideText, SLIDES_ARRAY_KEY } from "@/app/slide-doc";

type FeedMessage = {
  id: string;
  data: {
    role: "assistant";
    content: string;
    proposals?: { slideId: string; html: string }[];
    proposalStatus?: "pending" | "applied" | "rejected";
  };
};

const lb = vi.hoisted(() => {
  let serverDoc: Y.Doc | undefined;
  let message: FeedMessage | null = null;

  return {
    reset(doc: Y.Doc) {
      serverDoc = doc;
      message = null;
    },
    serverDoc: () => serverDoc as Y.Doc,
    setMessage(next: FeedMessage) {
      message = next;
    },
    getFeedMessages: vi.fn(async () => ({
      data: message ? [message] : [],
    })),
    getYjsDocumentAsBinaryUpdate: vi.fn(async () => {
      const yjs = await import("yjs");
      return yjs.encodeStateAsUpdate(serverDoc as Y.Doc);
    }),
    sendYjsBinaryUpdate: vi.fn(async (_roomId: string, update: Uint8Array) => {
      const yjs = await import("yjs");
      yjs.applyUpdate(serverDoc as Y.Doc, update);
    }),
    updateFeedMessage: vi.fn(async () => undefined),
  };
});

vi.mock("@liveblocks/node", () => ({
  Liveblocks: class MockLiveblocks {
    getFeedMessages = lb.getFeedMessages;
    getYjsDocumentAsBinaryUpdate = lb.getYjsDocumentAsBinaryUpdate;
    sendYjsBinaryUpdate = lb.sendYjsBinaryUpdate;
    updateFeedMessage = lb.updateFeedMessage;
  },
}));

import { POST } from "@/app/api/apply-slide/route";

const ROOM = "liveblocks:examples:nextjs-ai-slideshow:test";

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/apply-slide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  lb.reset(new Y.Doc());
  lb.getFeedMessages.mockClear();
  lb.getYjsDocumentAsBinaryUpdate.mockClear();
  lb.sendYjsBinaryUpdate.mockClear();
  lb.updateFeedMessage.mockClear();
  process.env.LIVEBLOCKS_SECRET_KEY = "sk_test";
});

afterEach(() => {
  delete process.env.LIVEBLOCKS_SECRET_KEY;
});

describe("POST /api/apply-slide", () => {
  it("returns 403 when LIVEBLOCKS_SECRET_KEY is missing", async () => {
    delete process.env.LIVEBLOCKS_SECRET_KEY;
    const response = await post({
      roomId: ROOM,
      feedId: "f",
      messageId: "m",
      action: "apply",
    });
    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid room id or action", async () => {
    expect(
      (
        await post({
          roomId: "other",
          feedId: "f",
          messageId: "m",
          action: "apply",
        })
      ).status
    ).toBe(400);
    expect(
      (
        await post({
          roomId: ROOM,
          feedId: "f",
          messageId: "m",
          action: "nope",
        })
      ).status
    ).toBe(400);
  });

  it("returns 404 when the feed message is not found", async () => {
    const response = await post({
      roomId: ROOM,
      feedId: "f",
      messageId: "missing",
      action: "apply",
    });
    expect(response.status).toBe(404);
  });

  it("apply with slideId new appends a slide returns newSlideIds and marks applied", async () => {
    const doc = lb.serverDoc();
    doc.getArray<string>(SLIDES_ARRAY_KEY).push(["existing"]);
    getSlideText(doc, "existing").insert(0, "<p>old</p>");

    lb.setMessage({
      id: "msg-1",
      data: {
        role: "assistant",
        content: "",
        proposals: [{ slideId: "new", html: "<p>brand</p>" }],
        proposalStatus: "pending",
      },
    });

    const response = await post({
      roomId: ROOM,
      feedId: "f",
      messageId: "msg-1",
      action: "apply",
    });
    const json = (await response.json()) as {
      ok: boolean;
      newSlideIds: string[];
    };

    expect(response.status).toBe(200);
    expect(json.newSlideIds).toHaveLength(1);
    expect(getSlideIds(doc)).toEqual(["existing", json.newSlideIds[0]]);
    expect(getSlideText(doc, json.newSlideIds[0]!).toString()).toBe(
      "<p>brand</p>"
    );
    expect(lb.updateFeedMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ proposalStatus: "applied" }),
      })
    );
  });

  it("apply to an existing slide id replaces that slide html with newSlideIds empty", async () => {
    const doc = lb.serverDoc();
    doc.getArray<string>(SLIDES_ARRAY_KEY).push(["slide-a"]);
    getSlideText(doc, "slide-a").insert(0, "<p>before</p>");

    lb.setMessage({
      id: "msg-1",
      data: {
        role: "assistant",
        content: "",
        proposals: [{ slideId: "slide-a", html: "<p>after</p>" }],
      },
    });

    const response = await post({
      roomId: ROOM,
      feedId: "f",
      messageId: "msg-1",
      action: "apply",
    });
    const json = (await response.json()) as { newSlideIds: string[] };

    expect(json.newSlideIds).toEqual([]);
    expect(getSlideText(doc, "slide-a").toString()).toBe("<p>after</p>");
  });

  it("apply ignores proposals for unknown non-new slide ids", async () => {
    const doc = lb.serverDoc();
    doc.getArray<string>(SLIDES_ARRAY_KEY).push(["keep"]);
    getSlideText(doc, "keep").insert(0, "<p>keep</p>");

    lb.setMessage({
      id: "msg-1",
      data: {
        role: "assistant",
        content: "",
        proposals: [{ slideId: "ghost", html: "<p>nope</p>" }],
      },
    });

    const response = await post({
      roomId: ROOM,
      feedId: "f",
      messageId: "msg-1",
      action: "apply",
    });
    const json = (await response.json()) as { newSlideIds: string[] };

    expect(json.newSlideIds).toEqual([]);
    expect(getSlideIds(doc)).toEqual(["keep"]);
    expect(getSlideText(doc, "keep").toString()).toBe("<p>keep</p>");
  });

  it("reject sets proposalStatus rejected without changing the yjs doc", async () => {
    const doc = lb.serverDoc();
    doc.getArray<string>(SLIDES_ARRAY_KEY).push(["s"]);
    getSlideText(doc, "s").insert(0, "<p>x</p>");

    lb.setMessage({
      id: "msg-1",
      data: {
        role: "assistant",
        content: "",
        proposals: [{ slideId: "s", html: "<p>y</p>" }],
        proposalStatus: "pending",
      },
    });

    await post({
      roomId: ROOM,
      feedId: "f",
      messageId: "msg-1",
      action: "reject",
    });

    expect(getSlideText(doc, "s").toString()).toBe("<p>x</p>");
    expect(lb.updateFeedMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ proposalStatus: "rejected" }),
      })
    );
    expect(lb.sendYjsBinaryUpdate).not.toHaveBeenCalled();
  });

  it("when the doc has no slides every proposal is appended as a new slide", async () => {
    const doc = lb.serverDoc();

    lb.setMessage({
      id: "msg-1",
      data: {
        role: "assistant",
        content: "",
        proposals: [
          { slideId: "looks-existing", html: "<p>one</p>" },
          { slideId: "new", html: "<p>two</p>" },
        ],
      },
    });

    const response = await post({
      roomId: ROOM,
      feedId: "f",
      messageId: "msg-1",
      action: "apply",
    });
    const json = (await response.json()) as { newSlideIds: string[] };

    expect(json.newSlideIds).toHaveLength(2);
    expect(getSlideIds(doc)).toEqual(json.newSlideIds);
  });
});
