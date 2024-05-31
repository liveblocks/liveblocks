import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { ThreadPanel } from "./comments/ThreadPanel";
export { liveblocksLexicalConfig } from "./liveblocks-config";
export { LiveblocksPluginProvider } from "./liveblocks-plugin-provider";
export { Mention } from "./mentions/mention-component";
export { FloatingComposer } from "./comments/floating-composer";
