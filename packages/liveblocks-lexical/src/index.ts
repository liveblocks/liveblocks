import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { LiveLexicalSelection, LiveRootNode } from "./types";
export type { LiveblocksCollaborationPluginProps } from "./react/liveblocks-collaboration-plugin";
export { LiveblocksCollaborationPlugin } from "./react/liveblocks-collaboration-plugin";
export { RemoteCursorsPlugin } from "./react/remote-cursors";
