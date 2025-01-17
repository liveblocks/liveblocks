import { detectDupes } from "@liveblocks/core";

import type { CommentsCommands } from "./types";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { AnchoredThreadsProps } from "./comments/AnchoredThreads";
export { AnchoredThreads } from "./comments/AnchoredThreads";
export type { FloatingComposerProps } from "./comments/FloatingComposer";
export { FloatingComposer } from "./comments/FloatingComposer";
export type { FloatingThreadsProps } from "./comments/FloatingThreads";
export { FloatingThreads } from "./comments/FloatingThreads";
export { useLiveblocksExtension } from "./LiveblocksExtension";
export { useIsEditorReady } from "./LiveblocksExtension";
export type { FloatingToolbarProps } from "./toolbar/FloatingToolbar";
export { FloatingToolbar } from "./toolbar/FloatingToolbar";
export type {
  ToolbarBlockSelectorItem,
  ToolbarBlockSelectorProps,
  ToolbarButtonProps,
  ToolbarProps,
  ToolbarSeparatorProps,
  ToolbarToggleProps,
} from "./toolbar/Toolbar";
export { Toolbar } from "./toolbar/Toolbar";
export type { HistoryVersionPreviewProps } from "./version-history/HistoryVersionPreview";
export { HistoryVersionPreview } from "./version-history/HistoryVersionPreview";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comments: CommentsCommands<ReturnType>;
  }
}
