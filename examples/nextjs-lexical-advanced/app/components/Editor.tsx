"use client";

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
  FloatingComposer,
  liveblocksConfig,
  LiveblocksPlugin,
  useEditorStatus,
} from "@liveblocks/react-lexical";
import { FloatingToolbar } from "./FloatingToolbar";
import { NotificationsPopover } from "./NotificationsPopover";
import { useState } from "react";
import { Loading } from "./Loading";
import { PreserveSelectionPlugin } from "./PreserveSelection";
import { DocumentName } from "./DocumentName";
import DraggableBlockPlugin from "../plugins/DraggableBlockPlugin";

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
      underline: "lexical-underline",
      strikethrough: "lexical-strikethrough",
    },
  },
});

export function Editor() {
  const status = useEditorStatus();

  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);
  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

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
              <div className="relative max-w-[740px] w-full mx-auto pb-[400px] p-8">
                <header className="mt-20 mb-0">
                  <h1>
                    <DocumentName />
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
                        Try mentioning a user with @
                      </span>
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                  />
                  {floatingAnchorElem ? (
                    <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
                  ) : null}
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
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      </LexicalComposer>
    </div>
  );
}
