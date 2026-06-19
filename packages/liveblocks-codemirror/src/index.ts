import { detectDupes } from "@liveblocks/core";

import { createLiveblocksPresencePlugin } from "./presence-plugin";
import { createLiveblocksSyncPlugin } from "./sync-plugin";
import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { createLiveblocksPresencePlugin, createLiveblocksSyncPlugin };
