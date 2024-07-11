"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  FloatingComposer,
  AnchoredThreads,
  liveblocksConfig,
  LiveblocksPlugin,
  useEditorStatus,
  FloatingThreads,
} from "@liveblocks/react-lexical";
import FloatingToolbar from "./floating-toolbar";
import NotificationsPopover from "../notifications-popover";
import Loading from "../loading";
import { useThreads } from "@liveblocks/react/suspense";
import { Suspense } from "react";
import { useIsMobile } from "./use-is-mobile";

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

  return (
    <div className="relative min-h-screen flex flex-col">
      <LexicalComposer initialConfig={initialConfig}>
        <LiveblocksPlugin>
          {status === "not-loaded" || status === "loading" ? (
            <Loading />
          ) : (
            <>
              <div className="h-[60px] flex items-center justify-end px-4 border-b border-border/80 bg-background">
                <NotificationsPopover />
              </div>

              <div className="relative flex flex-row justify-between w-full flex-1 py-16 px-32 overflow-auto gap-12">
                {/* Editable */}
                <div className="relative flex flex-1">
                  <RichTextPlugin
                    contentEditable={
                      <ContentEditable className="outline-none flex-1" />
                    }
                    placeholder={
                      <p className="pointer-events-none absolute top-0 left-0 text-muted-foreground w-full h-full">
                        Try mentioning a user with @
                      </p>
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                  />

                  <FloatingComposer className="w-[350px]" />

                  <FloatingToolbar />
                </div>

                <div className="lg:w-[350px]">
                  <Suspense fallback={null}>
                    <Threads />
                  </Suspense>
                </div>
              </div>
            </>
          )}
        </LiveblocksPlugin>
      </LexicalComposer>
    </div>
  );
}

function Threads() {
  const { threads } = useThreads();
  const isMobile = useIsMobile();

  return isMobile ? (
    <FloatingThreads threads={threads} />
  ) : (
    <AnchoredThreads threads={threads} />
  );
}
