import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { useLiveblocksExtension } from "./LiveblocksExtension";
export { AnchoredThreads } from "./comments/AnchoredThreads";
export { FloatingThreads } from "./comments/FloatingThreads";
export { FloatingComposer } from "./comments/FloatingComposer";
