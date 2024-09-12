"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  FloatingComposer,
  FloatingThreads,
  liveblocksConfig,
  LiveblocksPlugin,
  useEditorStatus,
} from "@liveblocks/react-lexical";
import { EditorTitle } from "@/components/EditorTitle";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { ClientSideSuspense, useThreads } from "@liveblocks/react/suspense";
import { EditorFloatingToolbar } from "@/components/EditorFloatingToolbar";
import { ReactNode } from "react";
import { LinkNode } from "@lexical/link";
import { CodeNode } from "@lexical/code";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";

// Wrap your Lexical config with `liveblocksConfig`
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

export function Editor({
  contentFallback,
  storageFallback,
}: {
  contentFallback: ReactNode;
  storageFallback: any;
}) {
  return (
    <ClientSideSuspense
      fallback={
        <div className="select-none cursor-wait editor-styles">
          <div className="block w-full text-2xl font-bold my-6">
            {storageFallback.meta.title}
          </div>
          {contentFallback}
        </div>
      }
    >
      <LexicalEditor contentFallback={contentFallback} />
    </ClientSideSuspense>
  );
}

function LexicalEditor({ contentFallback }: { contentFallback: ReactNode }) {
  const status = useEditorStatus();

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="">
        <div className="my-6">
          <EditorTitle />
        </div>
        <div className="relative">
          <LiveblocksPlugin>
            {status === "not-loaded" || status === "loading" ? (
              <div className="select-none cursor-wait editor-styles">
                {contentFallback}
              </div>
            ) : (
              <RichTextPlugin
                contentEditable={
                  <ContentEditable className="outline-none editor-styles" />
                }
                placeholder={
                  <div className="absolute top-0 left-0 pointer-events-none text-neutral-500 whitespace-nowrap">
                    Start typing here…
                  </div>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
            )}
            <ClientSideSuspense fallback={null}>
              <TextEditorThreads />
            </ClientSideSuspense>
            <FloatingComposer />
          </LiveblocksPlugin>
        </div>
      </div>
      <EditorFloatingToolbar />
    </LexicalComposer>
  );
}

function TextEditorThreads() {
  const { threads } = useThreads({ query: { resolved: false } });

  return <FloatingThreads threads={threads} />;
}
