import { detectDupes } from "@liveblocks/core";
import type { Snapshot } from "yjs";

import type { AiCommands, CommentsCommands } from "./types";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { AiToolbar } from "./ai/AiToolbar";
export { AnchoredThreads } from "./comments/AnchoredThreads";
export { FloatingComposer } from "./comments/FloatingComposer";
export { FloatingThreads } from "./comments/FloatingThreads";
export { useLiveblocksExtension } from "./LiveblocksExtension";
export { useIsEditorReady } from "./LiveblocksExtension";
export { FloatingToolbar } from "./toolbar/FloatingToolbar";
export { Toolbar } from "./toolbar/Toolbar";
export { HistoryVersionPreview } from "./version-history/HistoryVersionPreview";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    liveblocksComments: {
      /**
       * Add a comment
       */
      addComment: (id: string) => ReturnType;
      selectThread: (id: string | null) => ReturnType;
      addPendingComment: () => ReturnType;
    };
    liveblocksAi: {
      acceptAi: () => ReturnType;
      rejectAi: () => ReturnType;
      applyPrompt: (result: string, isContinue?: boolean) => ReturnType;
      doPrompt: (prompt: string, isContinue?: boolean) => ReturnType;
      compareSnapshot: (snapshot: Snapshot) => ReturnType;
    };
  }
}
