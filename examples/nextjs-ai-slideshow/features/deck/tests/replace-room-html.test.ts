import { NextRequest } from "next/server";
import * as Y from "yjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSlideIds, getSlideText, SLIDES_ARRAY_KEY } from "../slide-doc";

const lb = vi.hoisted(() => {
  let serverDoc: Y.Doc | undefined;

  return {
    reset(doc: Y.Doc) {
      serverDoc = doc;
    },
    serverDoc: () => serverDoc as Y.Doc,
    getYjsDocumentAsBinaryUpdate: vi.fn(async () => {
      const yjs = await import("yjs");
      return yjs.encodeStateAsUpdate(serverDoc as Y.Doc);
    }),
    sendYjsBinaryUpdate: vi.fn(async (_roomId: string, update: Uint8Array) => {
      const yjs = await import("yjs");
      yjs.applyUpdate(serverDoc as Y.Doc, update);
    }),
  };
});

vi.mock("@liveblocks/node", () => ({
  Liveblocks: class MockLiveblocks {
    getYjsDocumentAsBinaryUpdate = lb.getYjsDocumentAsBinaryUpdate;
    sendYjsBinaryUpdate = lb.sendYjsBinaryUpdate;
  },
}));

import { POST } from "../api/replace-room-html";

const ROOM = "liveblocks:examples:nextjs-ai-slideshow:deck";

function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/replace-room-html", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  lb.reset(new Y.Doc());
  process.env.LIVEBLOCKS_SECRET_KEY = "sk_test";
});

afterEach(() => {
  delete process.env.LIVEBLOCKS_SECRET_KEY;
});

describe("POST /api/replace-room-html", () => {
  it("returns 403 without LIVEBLOCKS_SECRET_KEY", async () => {
    delete process.env.LIVEBLOCKS_SECRET_KEY;
    const response = await post({ roomId: ROOM, slides: ["<p>a</p>"] });
    expect(response.status).toBe(403);
  });

  it("returns 400 for a bad room id", async () => {
    const response = await post({
      roomId: "other-room",
      slides: ["<p>a</p>"],
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 for an empty or non-string slides array", async () => {
    expect((await post({ roomId: ROOM, slides: [] })).status).toBe(400);
    expect((await post({ roomId: ROOM, slides: ["ok", 1] })).status).toBe(400);
    expect((await post({ roomId: ROOM, slides: [""] })).status).toBe(400);
  });

  it("replaces the deck with new 8-char ids in order and returns slideIds", async () => {
    const doc = lb.serverDoc();
    doc.getArray<string>(SLIDES_ARRAY_KEY).push(["old-one", "old-two"]);
    getSlideText(doc, "old-one").insert(0, "<p>old</p>");

    const htmlSlides = [
      "<html><body>One</body></html>",
      "<html><body>Two</body></html>",
    ];
    const response = await post({ roomId: ROOM, slides: htmlSlides });
    const json = (await response.json()) as { ok: boolean; slideIds: string[] };

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.slideIds).toHaveLength(2);
    expect(json.slideIds.every((id) => id.length === 8)).toBe(true);
    expect(getSlideIds(doc)).toEqual(json.slideIds);
    expect(getSlideText(doc, json.slideIds[0]!).toString()).toBe(htmlSlides[0]);
    expect(getSlideText(doc, json.slideIds[1]!).toString()).toBe(htmlSlides[1]);
  });
});
