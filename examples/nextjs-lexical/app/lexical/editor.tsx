"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HeadingNode } from "@lexical/rich-text";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  FloatingComposer,
  liveblocksConfig,
  LiveblocksPlugin,
  ThreadPanel,
} from "@liveblocks/react-lexical";
import FloatingToolbarPlugin from "./floating-toolbar-plugin";

// Wrap your initial config with `liveblocksConfig`
const initialConfig = liveblocksConfig({
  namespace: "Demo",
  nodes: [HeadingNode],
  onError: (error: unknown) => {
    console.error(error);
    throw error;
  },
});

export default function Editor() {
  return (
    <div className="flex flex-row h-full">
      <LexicalComposer initialConfig={initialConfig}>
        <LiveblocksPlugin>
          <div className="relative max-h-full w-[calc(100%-350px)] overflow-auto">
            <div className="relative flex m-auto max-w-[800px]">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable className="relative outline-none p-8 w-full h-full" />
                }
                placeholder={
                  <p className="pointer-events-none absolute top-8 left-8 text-gray-400 dark:text-gray-500 w-full h-full">
                    Try mentioning a user with @
                  </p>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
            </div>
          </div>

          <div className="text-sm relative w-[350px] h-full overflow-auto border-l">
            <ThreadPanel />
          </div>

          <FloatingToolbarPlugin />

          <FloatingComposer className="w-[350px]" />
        </LiveblocksPlugin>
      </LexicalComposer>
    </div>
  );
}
