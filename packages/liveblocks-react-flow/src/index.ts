import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { CursorsCursorProps, CursorsProps } from "./cursors";
export { Cursors } from "./cursors";
export type {
  EdgeSyncConfig,
  NodeSyncConfig,
  SyncConfig,
  SyncMode,
} from "./flow";
export { useLiveblocksFlow } from "./flow";
export { toLiveblocksEdge, toLiveblocksNode } from "./helpers";
export type { LiveblocksEdge, LiveblocksFlow, LiveblocksNode } from "./types";
