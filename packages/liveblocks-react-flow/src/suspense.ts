import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { CursorsCursorProps, CursorsProps } from "./cursors";
export { Cursors } from "./cursors";
export type {
  CustomSerializationConfig,
  EdgeSyncConfig,
  LiveblocksEdge,
  LiveblocksFlow,
  LiveblocksNode,
  NodeSyncConfig,
  SyncConfig,
} from "./flow";
export {
  createLiveblocksFlow,
  useLiveblocksFlowSuspense as useLiveblocksFlow,
} from "./flow";
