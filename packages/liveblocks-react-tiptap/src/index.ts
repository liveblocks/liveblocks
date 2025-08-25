import { detectDupes } from "@liveblocks/core";

import type { AiCommands, CommentsCommands } from "./types";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { AiToolbarProps } from "./ai/AiToolbar";
export { AiToolbar } from "./ai/AiToolbar";
export type { AnchoredThreadsProps } from "./comments/AnchoredThreads";
export { AnchoredThreads } from "./comments/AnchoredThreads";
export type { FloatingComposerProps } from "./comments/FloatingComposer";
export { FloatingComposer } from "./comments/FloatingComposer";
export type { FloatingThreadsProps } from "./comments/FloatingThreads";
export { FloatingThreads } from "./comments/FloatingThreads";
export { useLiveblocksExtension } from "./LiveblocksExtension";
export { useIsEditorReady } from "./LiveblocksExtension";
export { GroupMentionNode } from "./mentions/GroupMentionNode";
export { MentionExtension } from "./mentions/MentionExtension";
export { MentionNode } from "./mentions/MentionNode";
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
export type {
  AiConfiguration,
  ResolveContextualPromptArgs,
  ResolveContextualPromptResponse,
} from "./types";
export type { HistoryVersionPreviewProps } from "./version-history/HistoryVersionPreview";
export { HistoryVersionPreview } from "./version-history/HistoryVersionPreview";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    liveblocksComments: CommentsCommands<ReturnType>;
    liveblocksAi: AiCommands<ReturnType>;
  }
}
