"use client";

import { ClientSideSuspense, RoomProvider, useRoom } from "@liveblocks/react";
import { LiveList, LiveObject, LiveText, Room } from "@liveblocks/client";
import {
  use,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";

import type {
  LiveElementNode,
  LiveRootNode,
  LiveTextNode,
} from "../../../liveblocks.config";
import {
  Composer,
  ContentEditable,
  RichTextPlugin,
  useComposer,
} from "./composer";
import { DevToolsPlugin } from "./devtools/devtools";
import { LiveblocksCollaborationManager } from "./manager";

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{}}
      initialStorage={{
        document: new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList<LiveElementNode>([
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList<LiveTextNode>([
                new LiveObject({
                  kind: "text",
                  type: "text",
                  version: 1,
                  content: new LiveText(),
                }),
              ]),
            }),
          ]),
        }),
      }}
    >
      <ClientSideSuspense fallback={null}>
        <div className="h-dvh">
          <Editor />
        </div>
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function Editor() {
  const root = useRoot(useRoom());
  if (root === null) {
    return <div>Loading…</div>;
  }

  return (
    <Composer
      config={{
        namespace: "devtools",
        nodes: [HeadingNode, QuoteNode],
        theme: {
          text: {
            bold: "font-bold",
            italic: "italic",
            underline: "underline",
            strikethrough: "line-through",
            code: "font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded text-sm",
          },
          quote: "border-l-4 border-gray-300 dark:border-gray-700 pl-4 mb-4",
          heading: {
            h1: "text-4xl font-bold mb-4",
            h2: "text-3xl font-bold mb-4",
            h3: "text-2xl font-bold mb-4",
            h4: "text-xl font-bold mb-4",
            h5: "text-lg font-bold mb-4",
            h6: "text-base font-bold mb-4",
          },
          paragraph: "text-base mb-4",
          link: "text-blue-500 underline pointer-events-none after:content-['↗'] after:cursor-pointer after:font-bold after:pointer-events-auto",
          list: {
            ul: "list-disc mb-4",
            ol: "list-decimal mb-4",
            listitem: "ml-4 mb-1",
          },
          code: "block font-mono bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded text-sm mb-4",
        },
        onError: (error) => {
          console.error(error);
        },
      }}
    >
      <div className="relative text-base flex-1 flex">
        <ContentEditable className="outline-none flex-1" />
        <RichTextPlugin />
        <DevToolsPlugin />
        <LiveblocksCollaborationPlugin root={root.get("document")} />
      </div>
    </Composer>
  );
}

function LiveblocksCollaborationPlugin({ root }: { root: LiveRootNode }) {
  const editor = useComposer();

  const _manager = useRef<LiveblocksCollaborationManager | null>(null);
  if (_manager.current === null) {
    const manager = new LiveblocksCollaborationManager(root);
    editor.read(() => manager.$updateBinding());
    _manager.current = manager;
  }
  const manager = _manager.current;

  useEffect(() => {
    return editor.registerUpdateListener((update) => {
      manager.$applyLocalUpdates({
        dirtyElements: new Set(update.dirtyElements.keys()),
        dirtyLeaves: update.dirtyLeaves,
        normalizedNodes: update.normalizedNodes,
      });
    });
  }, [editor]);

  return null;
}

function useRoot(room: Room) {
  const subscribe = room.events.storageDidLoad.subscribeOnce;
  const getSnapshot = room.getStorageOrNull;
  const getServerSnapshot = useCallback(() => {
    return null;
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
