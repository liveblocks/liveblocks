import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { CommentProps } from "./components/Comment";
export { Comment } from "./components/Comment";
export type { ComposerProps } from "./components/Composer";
export { Composer } from "./components/Composer";
export type { ThreadProps } from "./components/Thread";
export { Thread } from "./components/Thread";
export { CommentsConfig } from "./config";
export type { ComposerSubmitComment } from "./primitives";
