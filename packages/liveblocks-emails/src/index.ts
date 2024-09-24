/* eslint-disable simple-import-sort/exports */
import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type {
  CommentBodySlotComponentsArgs,
  CommentBodyParagraphComponentArgs,
  CommentBodyTextComponentArgs,
  CommentBodyLinkComponentArgs,
  CommentBodyMentionComponentArgs,
  ConvertCommentBodyAsReactComponents,
} from "./comment-body";

export type {
  ResolveRoomInfoArgs,
  PrepareThreadNotificationEmailAsHTMLOptions,
  ThreadNotificationEmailAsHTML,
  PrepareThreadNotificationEmailAsReactOptions,
  ThreadNotificationEmailAsReact,
} from "./thread-notification";
export {
  prepareThreadNotificationEmailAsHTML,
  prepareThreadNotificationEmailAsReact,
} from "./thread-notification";
