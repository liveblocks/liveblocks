import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { ProviderOptions } from "./provider";
export { LiveblocksYjsProvider } from "./provider";
export { getYjsProviderForRoom } from "./providerContext";
