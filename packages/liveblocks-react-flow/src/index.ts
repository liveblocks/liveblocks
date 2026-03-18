import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { Cursors } from "./cursors";
export type {
  DataSyncSerializer,
  DataSyncValue,
  LiveblocksEdge,
  LiveblocksFlow,
  LiveblocksNode,
} from "./flow";
export { createLiveblocksFlow, useLiveblocksFlow } from "./flow";
