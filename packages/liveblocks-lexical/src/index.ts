import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { LiveblocksCollaborationManager } from "./manager";
export type { LiveLexicalSelection, LiveRootNode } from "./types";
