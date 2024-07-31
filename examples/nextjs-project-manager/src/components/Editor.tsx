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
import { Loading } from "@/components/Loading";
import { ClientSideSuspense } from "@liveblocks/react/suspense";

// Wrap your Lexical config with `liveblocksConfig`
const initialConfig = liveblocksConfig({
  namespace: "Demo",
  nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
  onError: (error: unknown) => {
    console.error(error);
    throw error;
  },
});

export function Editor() {
  return (
    <ClientSideSuspense
      fallback={
        <>
          <div className="bg-gray-100 animate-pulse h-8 rounded-lg my-6" />
          <div className="bg-gray-100 animate-pulse h-[98px] rounded-lg my-5" />
          <div className="bg-gray-100 animate-pulse h-[98px] rounded-lg my-5" />
        </>
      }
    >
      <LexicalEditor />
    </ClientSideSuspense>
  );
}

function LexicalEditor() {
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
              <>
                <div className="bg-gray-100 animate-pulse h-[98px] rounded-lg my-5" />
                <div className="bg-gray-100 animate-pulse h-[98px] rounded-lg my-5" />
              </>
            ) : (
              <RichTextPlugin
                contentEditable={<ContentEditable className="outline-none" />}
                placeholder={
                  <div className="absolute top-0 left-0 pointer-events-none text-gray-500">
                    Start typing here…
                  </div>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
            )}
          </LiveblocksPlugin>
        </div>
      </div>
    </LexicalComposer>
  );
}
