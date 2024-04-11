import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export {
  CommentPluginProvider,
  INSERT_THREAD_COMMAND,
  LastActiveSelection,
  LexicalThread,
  LexicalThreadComposer,
} from "./CommentPlugin";
export { LiveblocksPlugin } from "./LiveblocksPlugin";
export * from "./TextCollaborationProvider";
export * from "./ThreadMarkNode";
