import type { YjsSyncStatus } from "@liveblocks/core";
import type { Content } from "@tiptap/core";
import { createDocument } from "@tiptap/core";
import type { Schema } from "@tiptap/pm/model";
import { prosemirrorToYXmlFragment } from "y-prosemirror";
import { applyUpdate, Doc, encodeStateAsUpdate } from "yjs";

const LIVEBLOCKS_CONFIG_MAP = "liveblocks_config";
const HAS_CONTENT_SET_KEY = "hasContentSet";

const SEED_FORMAT_VERSION = 1;

export type InitialContentSeedOptions = {
  roomId: string;
  field: string;
  content: Content;
  schema: Schema;
};

type InitialContentProvider = {
  getYDoc(): Doc;
  getStatus(): YjsSyncStatus;
  on(event: "status", listener: () => void): void;
  off(event: "status", listener: () => void): void;
};

function hashTo31Bits(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash & 0x7fffffff;
}

export function createInitialContentSeed({
  roomId,
  field,
  content,
  schema,
}: InitialContentSeedOptions): Uint8Array {
  const node = createDocument(content, schema);
  const seedDoc = new Doc();

  seedDoc.clientID = hashTo31Bits(
    [SEED_FORMAT_VERSION, roomId, field, JSON.stringify(node.toJSON())].join(
      " "
    )
  );

  seedDoc.transact(() => {
    prosemirrorToYXmlFragment(node, seedDoc.getXmlFragment(field));
    seedDoc.getMap(LIVEBLOCKS_CONFIG_MAP).set(HAS_CONTENT_SET_KEY, true);
  });

  return encodeStateAsUpdate(seedDoc);
}

export function hasContentBeenSet(ydoc: Doc): boolean {
  return ydoc.getMap(LIVEBLOCKS_CONFIG_MAP).get(HAS_CONTENT_SET_KEY) === true;
}

export function seedInitialContentWhenReady(
  options: InitialContentSeedOptions & { provider: InitialContentProvider }
): () => void {
  const { provider } = options;
  let isCancelled = false;

  const seedWhenLoaded = () => {
    if (isCancelled || provider.getStatus() === "loading") {
      return;
    }
    provider.off("status", seedWhenLoaded);

    const ydoc = provider.getYDoc();
    if (hasContentBeenSet(ydoc)) {
      return;
    }
    applyUpdate(ydoc, createInitialContentSeed(options));
  };

  provider.on("status", seedWhenLoaded);
  seedWhenLoaded();

  return () => {
    isCancelled = true;
    provider.off("status", seedWhenLoaded);
  };
}
