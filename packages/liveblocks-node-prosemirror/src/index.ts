import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

export type {
  LiveblocksDocumentApi,
  LiveblocksProsemirrorOptions,
} from "./document";
export { withProsemirrorDocument } from "./document";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);
