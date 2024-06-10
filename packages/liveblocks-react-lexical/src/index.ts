import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export {
  FloatingComposer,
  OPEN_FLOATING_COMPOSER_COMMAND,
} from "./comments/floating-composer";
export { ThreadMarkNode } from "./comments/thread-mark-node";
export { ThreadsPanel } from "./comments/ThreadsPanel";
export { liveblocksConfig } from "./liveblocks-config";
export { LiveblocksPlugin } from "./liveblocks-plugin-provider";
export { Mention } from "./mentions/mention-component";
export { MentionNode } from "./mentions/mention-node";
