import { detectDupes } from "@liveblocks/core";

import type { AiCommands, CommentsCommands } from "./types.js";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version.js";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { AiToolbarProps } from "./ai/AiToolbar.js";
export { AiToolbar } from "./ai/AiToolbar.js";
export type { AnchoredThreadsProps } from "./comments/AnchoredThreads.js";
export { AnchoredThreads } from "./comments/AnchoredThreads.js";
export type { FloatingComposerProps } from "./comments/FloatingComposer.js";
export { FloatingComposer } from "./comments/FloatingComposer.js";
export type { FloatingThreadsProps } from "./comments/FloatingThreads.js";
export { FloatingThreads } from "./comments/FloatingThreads.js";
export { useLiveblocksExtension } from "./LiveblocksExtension.js";
export { useIsEditorReady } from "./LiveblocksExtension.js";
export { MentionExtension } from "./mentions/MentionExtension.js";
export { MentionNode } from "./mentions/MentionNode.js";
export type { FloatingToolbarProps } from "./toolbar/FloatingToolbar.js";
export { FloatingToolbar } from "./toolbar/FloatingToolbar.js";
export type {
  ToolbarBlockSelectorItem,
  ToolbarBlockSelectorProps,
  ToolbarButtonProps,
  ToolbarProps,
  ToolbarSeparatorProps,
  ToolbarToggleProps,
} from "./toolbar/Toolbar.js";
export { Toolbar } from "./toolbar/Toolbar.js";
export type {
  AiConfiguration,
  ResolveContextualPromptArgs,
  ResolveContextualPromptResponse,
} from "./types.js";
export type { HistoryVersionPreviewProps } from "./version-history/HistoryVersionPreview.js";
export { HistoryVersionPreview } from "./version-history/HistoryVersionPreview.js";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    liveblocksComments: CommentsCommands<ReturnType>;
    liveblocksAi: AiCommands<ReturnType>;
  }
}
