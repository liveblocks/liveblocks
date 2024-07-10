import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { AnchoredThreadsProps } from "./comments/anchored-threads";
export { AnchoredThreads } from "./comments/anchored-threads";
export { useIsThreadActive } from "./comments/comment-plugin-provider";
export type { FloatingComposerProps } from "./comments/floating-composer";
export {
  FloatingComposer,
  OPEN_FLOATING_COMPOSER_COMMAND,
} from "./comments/floating-composer";
export { liveblocksConfig } from "./liveblocks-config";
export {
  LiveblocksPlugin,
  useEditorStatus,
} from "./liveblocks-plugin-provider";
