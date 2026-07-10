"use client";

import { CodeNode } from "@lexical/code";
import { ListItemNode, ListNode } from "@lexical/list";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { LiveList, LiveObject, LiveText, type Room } from "@liveblocks/client";
import { LiveblocksCollaborationPlugin } from "@liveblocks/lexical/react";
import { ClientSideSuspense, RoomProvider, useRoom } from "@liveblocks/react";
import { use, useCallback, useSyncExternalStore } from "react";

import { Toolbar } from "./toolbar";

const THEME = {
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
};

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ selection: null }}
      initialStorage={{
        document: new LiveObject({
          kind: "root",
          type: "root",
          version: 1,
          children: new LiveList([
            new LiveObject({
              kind: "element",
              type: "paragraph",
              version: 1,
              children: new LiveList([
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
        <div className="flex h-dvh flex-col">
          <Editor />
        </div>
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function Editor() {
  const room = useRoom();
  const root = useRoot(room);
  if (root === null) {
    return <div>Loading…</div>;
  }

  const document = root.get("document");

  return (
    <LexicalComposer
      initialConfig={{
        namespace: "Liveblocks",
        nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode],
        theme: THEME,
        onError: (error) => {
          console.error(error);
        },
      }}
    >
      <Toolbar />
      <div className="relative flex flex-1 text-base">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="flex-1 px-4 outline-none" />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <ListPlugin />
        <AutoFocusPlugin />
        <LiveblocksCollaborationPlugin room={room} root={document} />
      </div>
    </LexicalComposer>
  );
}

function useRoot(room: Room) {
  const subscribe = room.events.storageDidLoad.subscribeOnce;
  const getSnapshot = room.getStorageOrNull;
  const getServerSnapshot = useCallback(() => {
    return null;
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
