import { createClient } from "@liveblocks/client";
import fetch from "cross-fetch";
import { Descendant, Editor, Element, Transforms } from "slate";
import WebSocket from "ws";
import {
  createWithLiveblocks,
  LiveblocksEditor,
  slateRootToLiveRoot,
} from "../src";
import { UnitTestRoom } from "./types";

const INLINE_ELEMENTS = ["note-link", "link"];

export async function wait(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForLiveRootChange(
  editor: LiveblocksEditor,
  timeout: number = 2000
) {
  const liveRootUpdate = new Promise<void>((resolve) => {
    const unsubscribe = editor.room.subscribe(
      editor.liveRoot,
      () => {
        resolve();
        unsubscribe();
      },
      { isDeep: true }
    );
  });

  return Promise.race([liveRootUpdate, wait(timeout)]);
}

export function waitForStorageSync(editor: LiveblocksEditor) {
  if (editor.room.getStorageStatus() === "synchronized") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const unsubscribe = editor.room.subscribe("storage-status", (status) => {
      if (status === "synchronized") {
        resolve();
        unsubscribe();
      }
    });
  });
}

export async function setupTestRoom(
  roomId: string,
  { initialValue }: { initialValue?: Descendant[] } = {}
) {
  // TODO: Not hard-code this.
  const client = createClient({
    fetchPolyfill: fetch,
    WebSocketPolyfill: WebSocket,
    publicApiKey: process.env.LIVEBLOCKS_PUBLIC_KEY!,
  });

  return client.enter(roomId, {
    shouldInitiallyConnect: true,
    initialPresence: {},
    initialStorage: initialValue
      ? { liveRoot: slateRootToLiveRoot(initialValue) }
      : undefined,
  });
}

export function withTestingElements(editor: Editor) {
  const { normalizeNode, isInline } = editor;

  // normalizations needed for nested tests
  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    // remove empty list
    if (
      Element.isElement(node) &&
      !Editor.isEditor(node) &&
      node.type === "unordered-list"
    ) {
      if (!node.children.length) {
        return Transforms.removeNodes(editor, { at: path });
      }
    }

    normalizeNode(entry);
  };

  editor.isInline = (element) =>
    INLINE_ELEMENTS.includes(element.type as string) || isInline(element);

  return editor;
}

export async function withCollaborativeTestPlugins<T extends Editor>(
  editor: T,
  room: UnitTestRoom
) {
  const storage = await room.getStorage();
  const liveRoot = storage.root.get("liveRoot");
  const withLiveBlocks = createWithLiveblocks({ room, liveRoot });

  const e = withLiveBlocks(withTestingElements(editor));
  LiveblocksEditor.connect(e);

  // Ensure editor is flushed.
  await wait();

  return e;
}
