import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type {
  LiveblocksEdge,
  LiveblocksFlow,
  LiveblocksFlowRoot,
  LiveblocksNode,
} from "./flow";
export { useLiveblocksFlow } from "./flow";
