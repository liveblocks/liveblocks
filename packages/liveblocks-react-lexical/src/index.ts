import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { LiveblocksPlugin } from "./LiveblocksPlugin";
export { LiveblocksPlugin2 } from "./LiveblocksPlugin2";
