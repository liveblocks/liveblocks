"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  FloatingComposer,
  liveblocksConfig,
  LiveblocksPlugin,
  ThreadPanel,
} from "@liveblocks/react-lexical";
import FloatingToolbar from "./floating-toolbar";
import NotificationsPopover from "../notifications-popover";
import Toolbar from "./toolbar";

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
  return (
    <div className="relative flex flex-col h-full w-full">
      <LexicalComposer initialConfig={initialConfig}>
        {/* Sticky header */}
        <div className="h-[50px] flex items-center justify-between px-4 border-b sticky top-0 left-0 bg-white z-10">
          <div className="flex items-center gap-2 h-full">
            <Toolbar />
          </div>

          <NotificationsPopover />
        </div>

        <div className="relative flex flex-row justify-between h-[calc(100%-50px)] w-full flex-1">
          {/* Editable */}
          <div className="relative h-full w-[calc(100%-350px)] overflow-auto">
            <div className="relative max-w-[950px] mx-auto">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable className="relative outline-none p-8 w-full h-full" />
                }
                placeholder={
                  <p className="pointer-events-none absolute top-0 left-0 p-8 text-gray-400 dark:text-gray-500 w-full h-full">
                    Try mentioning a user with @
                  </p>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />

              <FloatingToolbar />
            </div>
          </div>

          <LiveblocksPlugin>
            <FloatingComposer className="w-[350px]" />

            {/* Threads List */}
            <ThreadPanel className="text-sm relative w-[350px] h-full overflow-auto border-l" />
          </LiveblocksPlugin>
        </div>
      </LexicalComposer>
    </div>
  );
}
