import { createDocument, getSchema } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { describe, expect, test, vi } from "vitest";
import { prosemirrorToYXmlFragment } from "y-prosemirror";
import { applyUpdate, Doc, encodeStateAsUpdate } from "yjs";

import {
  createInitialContentSeed,
  hasContentBeenSet,
  seedInitialContentWhenReady,
} from "../initialContent";

const schema = getSchema([Document, Paragraph, Text]);

const FIELD = "default";
const ROOM_ID = "my-room";

function seed(content: string, roomId = ROOM_ID) {
  return createInitialContentSeed({
    roomId,
    field: FIELD,
    content,
    schema,
  });
}

function createRelay(...updates: Uint8Array[]) {
  const relay = new Doc();
  for (const update of updates) {
    applyUpdate(relay, update);
  }
  return relay;
}

function getParagraphs(ydoc: Doc) {
  return ydoc
    .getXmlFragment(FIELD)
    .toArray()
    .map((node) => node.toString());
}

function createSeedWithRandomClientId(content: string) {
  const doc = new Doc();
  doc.transact(() => {
    prosemirrorToYXmlFragment(
      createDocument(content, schema),
      doc.getXmlFragment(FIELD)
    );
  });
  return encodeStateAsUpdate(doc);
}

function createFakeProvider(ydoc: Doc, status: "loading" | "synchronized") {
  const listeners = new Set<() => void>();
  return {
    getYDoc: () => ydoc,
    getStatus: () => status,
    on: (_event: "status", listener: () => void) => listeners.add(listener),
    off: (_event: "status", listener: () => void) => listeners.delete(listener),
    finishSync: () => {
      status = "synchronized";
      for (const listener of [...listeners]) {
        listener();
      }
    },
    listenerCount: () => listeners.size,
  };
}

describe("createInitialContentSeed", () => {
  test("two concurrent seeders of the same content converge on one copy", () => {
    const first = seed("<p>Hello world</p>");
    const second = seed("<p>Hello world</p>");

    expect(second).toEqual(first);

    const merged = createRelay(first, second);

    expect(getParagraphs(merged)).toEqual([
      "<paragraph>Hello world</paragraph>",
    ]);
    expect(hasContentBeenSet(merged)).toBe(true);
  });

  test("random client ids duplicate the same content, which is why the id is derived", () => {
    const merged = createRelay(
      createSeedWithRandomClientId("<p>Hello world</p>"),
      createSeedWithRandomClientId("<p>Hello world</p>")
    );

    expect(getParagraphs(merged)).toHaveLength(2);
  });

  test("seeders holding different content keep both copies without corrupting the doc", () => {
    const merged = createRelay(seed("<p>One</p>"), seed("<p>Two</p>"));

    expect(getParagraphs(merged).sort()).toEqual([
      "<paragraph>One</paragraph>",
      "<paragraph>Two</paragraph>",
    ]);
    expect(hasContentBeenSet(merged)).toBe(true);
    expect(() => encodeStateAsUpdate(merged)).not.toThrow();
  });

  test("the same content in a different room or field derives a different seed", () => {
    expect(seed("<p>Hello</p>", "other-room")).not.toEqual(
      seed("<p>Hello</p>")
    );
    expect(
      createInitialContentSeed({
        roomId: ROOM_ID,
        field: "other-field",
        content: "<p>Hello</p>",
        schema,
      })
    ).not.toEqual(seed("<p>Hello</p>"));
  });

  test("seed bytes are pinned, so bump SEED_FORMAT_VERSION when this changes", () => {
    expect(Buffer.from(seed("<p>Hello world</p>")).toString("base64")).toBe(
      "AQTFsr64BwAHAQdkZWZhdWx0AwlwYXJhZ3JhcGgHAMWyvrgHAAYEAMWyvrgHAQtIZWxsbyB3b3JsZCgBEWxpdmVibG9ja3NfY29uZmlnDWhhc0NvbnRlbnRTZXQBeAA="
    );
  });

  test("content and flag land together, even when the update is applied twice", () => {
    const update = seed("<p>Hello</p>");
    const room = createRelay(update, update);

    expect(hasContentBeenSet(room)).toBe(true);
    expect(getParagraphs(room)).toEqual(["<paragraph>Hello</paragraph>"]);
  });

  test("a lost seed leaves the room unflagged and seedable", () => {
    const room = createRelay();

    expect(hasContentBeenSet(room)).toBe(false);

    applyUpdate(room, seed("<p>Hello</p>"));

    expect(hasContentBeenSet(room)).toBe(true);
  });
});

describe("seedInitialContentWhenReady", () => {
  test("seeds a room that becomes ready after the editor is created", () => {
    const ydoc = new Doc();
    const provider = createFakeProvider(ydoc, "loading");

    seedInitialContentWhenReady({
      provider,
      roomId: ROOM_ID,
      field: FIELD,
      content: "<p>Hello</p>",
      schema,
    });

    expect(hasContentBeenSet(ydoc)).toBe(false);

    provider.finishSync();

    expect(hasContentBeenSet(ydoc)).toBe(true);
    expect(getParagraphs(ydoc)).toEqual(["<paragraph>Hello</paragraph>"]);
    expect(provider.listenerCount()).toBe(0);
  });

  test("seeds immediately when the editor is created after the room is ready", () => {
    const ydoc = new Doc();
    const provider = createFakeProvider(ydoc, "synchronized");

    seedInitialContentWhenReady({
      provider,
      roomId: ROOM_ID,
      field: FIELD,
      content: "<p>Hello</p>",
      schema,
    });

    expect(hasContentBeenSet(ydoc)).toBe(true);
  });

  test("does not seed a room that was already seeded", () => {
    const ydoc = new Doc();
    applyUpdate(ydoc, seed("<p>Hello</p>"));
    const provider = createFakeProvider(ydoc, "synchronized");

    seedInitialContentWhenReady({
      provider,
      roomId: ROOM_ID,
      field: FIELD,
      content: "<p>Something else</p>",
      schema,
    });

    expect(getParagraphs(ydoc)).toEqual(["<paragraph>Hello</paragraph>"]);
  });

  test("writes nothing when the editor is destroyed before the room is ready", () => {
    const ydoc = new Doc();
    const provider = createFakeProvider(ydoc, "loading");
    const onUpdate = vi.fn();
    ydoc.on("update", onUpdate);

    const cancel = seedInitialContentWhenReady({
      provider,
      roomId: ROOM_ID,
      field: FIELD,
      content: "<p>Hello</p>",
      schema,
    });
    cancel();
    provider.finishSync();

    expect(hasContentBeenSet(ydoc)).toBe(false);
    expect(onUpdate).not.toHaveBeenCalled();
    expect(provider.listenerCount()).toBe(0);
  });
});
