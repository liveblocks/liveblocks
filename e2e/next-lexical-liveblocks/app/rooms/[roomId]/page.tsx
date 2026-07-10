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
    code: "rounded bg-neutral-100 p-1 font-mono text-sm dark:bg-neutral-800",
  },
  quote:
    "mb-4 border-l-4 border-neutral-300 pl-4 dark:border-neutral-700",
  heading: {
    h1: "mb-4 text-4xl font-bold",
    h2: "mb-4 text-3xl font-bold",
    h3: "mb-4 text-2xl font-bold",
    h4: "mb-4 text-xl font-bold",
    h5: "mb-4 text-lg font-bold",
    h6: "mb-4 text-base font-bold",
  },
  paragraph: "mb-4 text-base",
  link: "pointer-events-none text-blue-500 underline after:pointer-events-auto after:cursor-pointer after:font-bold after:content-['↗']",
  list: {
    ul: "mb-4 list-disc",
    ol: "mb-4 list-decimal",
    listitem: "mb-1 ml-4",
  },
  code: "mb-4 block rounded bg-neutral-100 px-4 py-2 font-mono text-sm dark:bg-neutral-800",
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
        <div className="flex h-dvh flex-col bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
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
    return (
      <div className="p-4 text-neutral-500 dark:text-neutral-400">
        Loading…
      </div>
    );
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
