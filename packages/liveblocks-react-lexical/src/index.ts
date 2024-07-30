import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { useIsThreadActive } from "./comments/comment-plugin-provider";
export {
  FloatingComposer,
  OPEN_FLOATING_COMPOSER_COMMAND,
} from "./comments/floating-composer";
export { liveblocksConfig } from "./liveblocks-config";
export {
  LiveblocksPlugin,
  useEditorStatus,
} from "./liveblocks-plugin-provider";
export { Version } from "./versions/Version";
export { Versions } from "./versions/Versions";
