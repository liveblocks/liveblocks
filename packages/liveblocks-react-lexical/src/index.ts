import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { AnchoredThreadsProps } from "./comments/anchored-threads";
export { AnchoredThreads } from "./comments/anchored-threads";
export { useIsThreadActive } from "./comments/comment-plugin-provider";
export type { FloatingComposerProps } from "./comments/floating-composer";
export {
  ATTACH_THREAD_COMMAND,
  FloatingComposer,
  OPEN_FLOATING_COMPOSER_COMMAND,
} from "./comments/floating-composer";
export type { FloatingThreadsProps } from "./comments/floating-threads";
export { FloatingThreads } from "./comments/floating-threads";
export { isBlockNodeActive } from "./is-block-node-active";
export { isTextFormatActive } from "./is-text-format-active";
export { liveblocksConfig } from "./liveblocks-config";
export {
  LiveblocksPlugin,
  useIsEditorReady,
} from "./liveblocks-plugin-provider";
export type { FloatingToolbarProps } from "./toolbar/floating-toolbar";
export { FloatingToolbar } from "./toolbar/floating-toolbar";
export type {
  ToolbarBlockSelectorItem,
  ToolbarBlockSelectorProps,
  ToolbarButtonProps,
  ToolbarProps,
  ToolbarSeparatorProps,
  ToolbarToggleProps,
} from "./toolbar/toolbar";
export { Toolbar } from "./toolbar/toolbar";
export type { HistoryVersionPreviewProps } from "./version-history/history-version-preview";
export { HistoryVersionPreview } from "./version-history/history-version-preview";
