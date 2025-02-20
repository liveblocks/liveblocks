import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version.js";

export type {
  LiveblocksDocumentApi,
  LiveblocksProsemirrorOptions,
} from "./document.js";
export { withProsemirrorDocument } from "./document.js";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);
