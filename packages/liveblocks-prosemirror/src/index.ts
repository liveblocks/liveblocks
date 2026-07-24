import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type {
  CollaborationCaretOptions,
  CollaborationCaretPluginState,
  CollaborationCaretStorage,
  CursorUser,
  RemoteCursor,
} from "./cursors";
export {
  createLiveblocksCollaborationCaretPlugin,
  getCursorUser,
  LIVEBLOCKS_CARET_PLUGIN_KEY,
  LIVEBLOCKS_CARET_PRESENCE_KEY,
  presencePatch,
} from "./cursors";
export type { LiveblocksCollaborationOptions } from "./plugin";
export {
  createLiveblocksCollaborationPlugin,
  LIVEBLOCKS_COLLABORATION_PLUGIN_KEY,
} from "./plugin";
export type {
  LiveblocksProsemirrorNode,
  ProseMirrorJsonMark,
  ProseMirrorJsonNode,
} from "./schema";
export {
  createLiveblocksProsemirrorNode,
  getLiveblocksNodeContent,
  getLiveblocksNodeId,
  getLiveblocksNodeText,
  liveblocksProsemirrorNodeToJson,
  liveblocksProsemirrorNodeToJsonNodes,
} from "./schema";
export type { LiveblocksProsemirrorRoom } from "./types";
