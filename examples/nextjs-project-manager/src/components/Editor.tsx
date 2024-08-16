"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  liveblocksConfig,
  LiveblocksPlugin,
  useEditorStatus,
} from "@liveblocks/react-lexical";
import { EditorTitle } from "@/components/EditorTitle";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { ClientSideSuspense } from "@liveblocks/react/suspense";
import { EditorFloatingToolbar } from "@/components/EditorFloatingToolbar";
import { ReactNode } from "react";

// Wrap your Lexical config with `liveblocksConfig`
const initialConfig = liveblocksConfig({
  namespace: "Demo",
  nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
  onError: (error: unknown) => {
    console.error(error);
    throw error;
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
        <div className="select-none cursor-wait">
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
              <div className="select-none cursor-wait">{contentFallback}</div>
            ) : (
              <RichTextPlugin
                contentEditable={<ContentEditable className="outline-none" />}
                placeholder={
                  <div className="absolute top-0 left-0 pointer-events-none text-neutral-500 whitespace-nowrap">
                    Start typing here…
                  </div>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
            )}
          </LiveblocksPlugin>
        </div>
      </div>
      <EditorFloatingToolbar />
    </LexicalComposer>
  );
}
