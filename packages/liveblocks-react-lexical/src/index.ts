import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version.js";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { AnchoredThreadsProps } from "./comments/anchored-threads.js";
export { AnchoredThreads } from "./comments/anchored-threads.js";
export { useIsThreadActive } from "./comments/comment-plugin-provider.js";
export type { FloatingComposerProps } from "./comments/floating-composer.js";
export {
  FloatingComposer,
  OPEN_FLOATING_COMPOSER_COMMAND,
} from "./comments/floating-composer.js";
export type { FloatingThreadsProps } from "./comments/floating-threads.js";
export { FloatingThreads } from "./comments/floating-threads.js";
export { isBlockNodeActive } from "./is-block-node-active.js";
export { isTextFormatActive } from "./is-text-format-active.js";
export { liveblocksConfig } from "./liveblocks-config.js";
export {
  LiveblocksPlugin,
  useEditorStatus,
  useIsEditorReady,
} from "./liveblocks-plugin-provider.js";
export type { FloatingToolbarProps } from "./toolbar/floating-toolbar.js";
export { FloatingToolbar } from "./toolbar/floating-toolbar.js";
export type {
  ToolbarBlockSelectorItem,
  ToolbarBlockSelectorProps,
  ToolbarButtonProps,
  ToolbarProps,
  ToolbarSeparatorProps,
  ToolbarToggleProps,
} from "./toolbar/toolbar.js";
export { Toolbar } from "./toolbar/toolbar.js";
export type { HistoryVersionPreviewProps } from "./version-history/history-version-preview.js";
export { HistoryVersionPreview } from "./version-history/history-version-preview.js";
