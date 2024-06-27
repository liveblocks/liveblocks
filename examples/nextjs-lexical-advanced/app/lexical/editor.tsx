"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { Thread } from "@liveblocks/react-ui";
import {
  FloatingComposer,
  liveblocksConfig,
  LiveblocksPlugin,
  useEditorStatus,
  useIsThreadActive,
} from "@liveblocks/react-lexical";
import FloatingToolbar from "./floating-toolbar";
import NotificationsPopover from "../notifications-popover";
import Toolbar from "./toolbar";
import { useThreads, useRoom } from "@liveblocks/react/suspense";
import { Suspense } from "react";
import Loading from "../loading";
import { BaseMetadata, ThreadData } from "@liveblocks/client";
import { askAi } from "../actions/ai";

// Wrap your initial config with `liveblocksConfig`
const initialConfig = liveblocksConfig({
  namespace: "Demo",
  nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
  onError: (error: unknown) => {
    console.error(error);
    throw error;
  },
});

export default function Editor() {
  const status = useEditorStatus();
  const room = useRoom();

  return (
    <div className="relative flex flex-col h-full w-full">
      <button onClick={() => askAi(room.id, "")}>ask ai</button>
      <LexicalComposer initialConfig={initialConfig}>
        {/* Sticky header */}
        <div className="sticky top-0 left-0  h-[60px] flex items-center justify-between px-4 border-b border-border/80 z-20 bg-background/95">
          <div className="flex items-center gap-2 h-full">
            <Toolbar />
          </div>

          <NotificationsPopover />
        </div>

        <div className="relative flex flex-row justify-between h-[calc(100%-60px)] w-full flex-1">
          {/* Editable */}
          <div className="relative h-full w-[calc(100%-350px)] overflow-auto">
            {status === "not-loaded" || status === "loading" ? (
              <Loading />
            ) : (
              <div className="relative max-w-[950px] mx-auto">
                <RichTextPlugin
                  contentEditable={
                    <ContentEditable className="relative outline-none p-8 w-full h-full" />
                  }
                  placeholder={
                    <p className="pointer-events-none absolute top-0 left-0 p-8 text-muted-foreground w-full h-full">
                      Try mentioning a user with @
                    </p>
                  }
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <FloatingToolbar />
              </div>
            )}
          </div>

          <LiveblocksPlugin>
            <FloatingComposer className="w-[350px]" />

            {/* Threads List */}
            <Suspense fallback={<Loading />}>
              <Threads />
            </Suspense>
          </LiveblocksPlugin>
        </div>
      </LexicalComposer>
    </div>
  );
}

function Threads() {
  const { threads } = useThreads();

  return (
    <div className="text-sm relative w-[350px] h-full overflow-auto border-l border-border/80">
      {threads.map((thread) => {
        return <ThreadWrapper key={thread.id} thread={thread} />;
      })}
    </div>
  );
}

function ThreadWrapper({ thread }: { thread: ThreadData<BaseMetadata> }) {
  const isActive = useIsThreadActive(thread.id);

  return (
    <Thread
      thread={thread}
      data-state={isActive ? "active" : null}
      className="p-2 border-b border-border"
    />
  );
}
