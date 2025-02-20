import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version.js";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { ProviderOptions } from "./provider.js";
export { LiveblocksYjsProvider } from "./provider.js";
export { getYjsProviderForRoom } from "./providerContext.js";
