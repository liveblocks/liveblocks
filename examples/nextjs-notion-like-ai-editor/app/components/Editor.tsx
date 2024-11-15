"use client";

import { useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { TRANSFORMERS } from "@lexical/markdown";
import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  AnchoredThreads,
  FloatingComposer,
  FloatingThreads,
  liveblocksConfig,
  LiveblocksPlugin,
  useIsEditorReady,
} from "@liveblocks/react-lexical";
import { ClientSideSuspense, useThreads } from "@liveblocks/react";
import DraggableBlockPlugin from "../plugins/DraggableBlockPlugin";
import { PreserveSelectionPlugin } from "../plugins/PreserveSelectionPlugin";
import { DocumentName } from "./DocumentName";
import { FloatingToolbar } from "./FloatingToolbar";

// Wrap your initial config with `liveblocksConfig`
const initialConfig = liveblocksConfig({
  namespace: "Demo",
  nodes: [
    HorizontalRuleNode,
    CodeNode,
    LinkNode,
    ListNode,
    ListItemNode,
    HeadingNode,
    QuoteNode,
  ],
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
});

export function Editor() {
  const ready = useIsEditorReady();
  const { threads } = useThreads();

  // Used by the drag handle
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);
  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div
        // Target the cursors and raise their z-index above the editor
        className="first:*:z-10 contents"
      >
        <LiveblocksPlugin>
          <div className="relative flex flex-row justify-between h-[calc(100%-60px)] w-full flex-1">
            <div className="relative h-full w-full overflow-y-auto overflow-x-hidden">
              {/* The floating composer for creating new threads */}
              <FloatingComposer className="w-[350px]" />

              {/* The floating threads that appear on mobile */}
              {threads ? (
                <FloatingThreads
                  threads={threads}
                  className="block xl:hidden"
                />
              ) : null}

              <div className="xl:mr-[200px]">
                <div className="relative max-w-[740px] w-full mx-auto pb-[400px] p-8">
                  <div className="absolute left-full -ml-8">
                    {/* The anchored threads in the sidebar, on desktop */}
                    {threads ? (
                      <AnchoredThreads
                        threads={threads}
                        className="w-[270px] hidden xl:block"
                      />
                    ) : null}
                  </div>

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

                  {!ready ? (
                    <div className="mx-8 mt-4 bg-gray-200/40 animate-pulse w-full h-32 rounded-lg" />
                  ) : (
                    <section className="relative">
                      {/* The editor */}
                      <RichTextPlugin
                        contentEditable={
                          <div ref={onRef}>
                            <ContentEditable className="relative outline-none w-full h-full px-8 py-4" />
                          </div>
                        }
                        placeholder={
                          <span className="pointer-events-none absolute top-7 mt-px left-8 text-muted-foreground w-full h-full">
                            Try mentioning a user with @
                          </span>
                        }
                        ErrorBoundary={LexicalErrorBoundary}
                      />

                      {/* Click and drag editor blocks by their handle */}
                      {floatingAnchorElem ? (
                        <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
                      ) : null}

                      {/* Text modification and AI toolbar */}
                      <FloatingToolbar />
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
          <PreserveSelectionPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        </LiveblocksPlugin>
      </div>
    </LexicalComposer>
  );
}
