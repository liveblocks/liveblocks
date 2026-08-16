"use client";

import { ListItemNode, ListNode } from "@lexical/list";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import type { Room } from "@liveblocks/client";
import {
  LiveblocksCollaborationPlugin,
  RemoteCursorsPlugin,
} from "@liveblocks/lexical";
import { useRoom } from "@liveblocks/react/suspense";
import { useCallback, useSyncExternalStore } from "react";

import Loading from "../loading";
import { Toolbar } from "./toolbar";

const THEME = {
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
  },
  quote: "editor-quote",
  heading: {
    h1: "editor-heading-h1",
    h2: "editor-heading-h2",
    h3: "editor-heading-h3",
    h4: "editor-heading-h4",
    h5: "editor-heading-h5",
  },
  paragraph: "editor-paragraph",
  list: {
    ul: "editor-list-ul",
    ol: "editor-list-ol",
    listitem: "editor-list-item",
  },
};

export default function Editor() {
  const room = useRoom();
  const root = useRoot(room);

  if (root === null) {
    return <Loading />;
  }

  const document = root.get("document");

  return (
    <div className="relative flex min-h-screen flex-col">
      <LexicalComposer
        initialConfig={{
          namespace: "Demo",
          nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
          theme: THEME,
          onError: (error: unknown) => {
            console.error(error);
            throw error;
          },
        }}
      >
        <div className="border-b border-border/80 bg-background">
          <Toolbar />
        </div>

        <div className="relative flex flex-1 px-4 py-16 sm:px-8 lg:px-16">
          <div className="relative mx-auto w-full max-w-3xl flex-1">
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="outline-none transition-all" />
              }
              placeholder={
                <p className="pointer-events-none absolute top-0 left-0 h-full w-full text-muted-foreground">
                  Start typing here…
                </p>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <ListPlugin />
            <LiveblocksCollaborationPlugin root={document}>
              <RemoteCursorsPlugin />
            </LiveblocksCollaborationPlugin>
          </div>
        </div>
      </LexicalComposer>
    </div>
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
