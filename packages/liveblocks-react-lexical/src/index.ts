import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export {
  FloatingComposer,
  OPEN_FLOATING_COMPOSER_COMMAND,
} from "./comments/floating-composer";
export { ThreadPanel } from "./comments/ThreadPanel";
export { liveblocksLexicalConfig } from "./liveblocks-config";
export { LiveblocksPluginProvider } from "./liveblocks-plugin-provider";
export { Mention } from "./mentions/mention-component";
