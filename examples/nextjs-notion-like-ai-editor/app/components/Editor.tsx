"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { TRANSFORMERS } from "@lexical/markdown";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  LiveblocksCollaborationPlugin,
  RemoteCursorsPlugin,
} from "@liveblocks/lexical";
import { ClientSideSuspense, useRoom } from "@liveblocks/react";
import type { Room } from "@liveblocks/client";
import DraggableBlockPlugin from "../plugins/DraggableBlockPlugin";
import { PreserveSelectionPlugin } from "../plugins/PreserveSelectionPlugin";
import { DocumentName } from "./DocumentName";
import { FloatingToolbar } from "./FloatingToolbar";
import { LEXICAL_NODES } from "../utils/lexical-nodes";

const initialConfig = {
  namespace: "Demo",
  nodes: LEXICAL_NODES,
  onError: (error: unknown) => {
    console.error(error);
    throw error;
  },
  theme: {
    text: {
      bold: "lexical-bold",
      italic: "lexical-italic",
      underline: "lexical-underline",
      strikethrough: "lexical-strikethrough",
    },
  },
};

export function Editor() {
  const room = useRoom();
  const root = useRoot(room);

  // Used by the drag handle
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);
  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  if (root === null) {
    return (
      <div className="relative flex flex-row justify-between h-[calc(100%-60px)] w-full flex-1">
        <div className="relative h-full w-full overflow-y-auto overflow-x-hidden">
          <div className="relative max-w-[740px] w-full mx-auto pb-[400px] p-8">
            <header className="mt-20 mb-0">
              <h1 className="mb-0">
                <ClientSideSuspense
                  fallback={
                    <div className="m-8 bg-gray-200/40 animate-pulse h-11 rounded-lg w-[400px] max-w-full" />
                  }
                >
                  <DocumentName />
                </ClientSideSuspense>
              </h1>
            </header>
            <div className="mx-8 mt-4 bg-gray-200/40 animate-pulse w-full h-32 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const document = root.get("document");

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="first:*:z-10 contents">
        <div className="relative flex flex-row justify-between h-[calc(100%-60px)] w-full flex-1">
          <div className="relative h-full w-full overflow-y-auto overflow-x-hidden">
            <div className="relative max-w-[740px] w-full mx-auto pb-[400px] p-8">
              <header className="mt-20 mb-0">
                <h1 className="mb-0">
                  <ClientSideSuspense
                    fallback={
                      <div className="m-8 bg-gray-200/40 animate-pulse h-11 rounded-lg w-[400px] max-w-full" />
                    }
                  >
                    <DocumentName />
                  </ClientSideSuspense>
                </h1>
              </header>

              <section className="relative">
                <RichTextPlugin
                  contentEditable={
                    <div ref={onRef}>
                      <ContentEditable className="relative outline-none w-full h-full px-8 py-4" />
                    </div>
                  }
                  placeholder={
                    <span className="pointer-events-none absolute top-7 mt-px left-8 text-muted-foreground w-full h-full">
                      Start writing…
                    </span>
                  }
                  ErrorBoundary={LexicalErrorBoundary}
                />

                {floatingAnchorElem ? (
                  <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
                ) : null}

                <FloatingToolbar />

                <PreserveSelectionPlugin />
                <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
                <LiveblocksCollaborationPlugin root={document}>
                  <RemoteCursorsPlugin />
                </LiveblocksCollaborationPlugin>
              </section>
            </div>
          </div>
        </div>
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
