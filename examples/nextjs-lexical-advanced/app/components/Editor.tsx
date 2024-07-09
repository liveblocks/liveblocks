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
import { FloatingToolbar } from "./FloatingToolbar";
import { NotificationsPopover } from "./NotificationsPopover";
import { Toolbar } from "./Toolbar";
import { useThreads } from "@liveblocks/react/suspense";
import { Suspense } from "react";
import { Loading } from "./Loading";
import { BaseMetadata, ThreadData } from "@liveblocks/client";
import { PreserveSelectionPlugin } from "./PreserveSelection";
import { DocumentName } from "./DocumentName";
import DraggableBlockPlugin from "../plugins/DraggableBlockPlugin";

// Wrap your initial config with `liveblocksConfig`
const initialConfig = liveblocksConfig({
  namespace: "Demo",
  nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
  onError: (error: unknown) => {
    console.error(error);
    throw error;
  },
});

export function Editor() {
  const status = useEditorStatus();

  return (
    <div className="relative flex flex-col h-full w-full">
      <LexicalComposer initialConfig={initialConfig}>
        {/* Sticky header */}
        <div className="sticky top-0 left-0  h-[60px] flex items-center justify-end px-4 z-20">
          <NotificationsPopover />
        </div>

        <div className="relative flex flex-row justify-between h-[calc(100%-60px)] w-full flex-1">
          {/* Editable */}
          <div className="relative h-full w-full overflow-auto">
            {status === "not-loaded" || status === "loading" ? (
              <Loading />
            ) : (
              <div className="relative max-w-[680px] mx-auto pb-[400px] p-8">
                <header className="mt-20 mb-8">
                  <h1>
                    <DocumentName />
                  </h1>
                </header>
                <section className="relative">
                  <RichTextPlugin
                    contentEditable={
                      <ContentEditable className="relative outline-none w-full h-full" />
                    }
                    placeholder={
                      <span className="pointer-events-none absolute top-0 left-0 text-muted-foreground w-full h-full">
                        Try mentioning a user with @
                      </span>
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                  />
                  <FloatingToolbar />
                </section>
              </div>
            )}
          </div>

          <LiveblocksPlugin>
            <FloatingComposer className="w-[350px]" />
          </LiveblocksPlugin>
        </div>
        <PreserveSelectionPlugin />
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
