import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { LiveblocksCollaboration } from "./collaboration";
export type { LiveLexicalSelection, LiveRootNode } from "./types";
