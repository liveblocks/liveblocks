"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  liveblocksConfig,
  LiveblocksPlugin,
  FloatingComposer,
} from "@liveblocks/react-lexical";
import { EditorTitle } from "@/components/EditorTitle";

export function Editor() {
  // Wrap your Lexical config with `liveblocksConfig`
  const initialConfig = liveblocksConfig({
    namespace: "Demo",
    onError: (error: unknown) => {
      console.error(error);
      throw error;
    },
  });

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="">
        <div className="my-6">
          <EditorTitle />
        </div>
        <div className="relative">
          <RichTextPlugin
            contentEditable={<ContentEditable className="outline-none" />}
            placeholder={
              <div className="absolute top-0 left-0 pointer-events-none text-gray-500">
                Start typing here…
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <LiveblocksPlugin>
          <FloatingComposer />
        </LiveblocksPlugin>
      </div>
    </LexicalComposer>
  );
}
