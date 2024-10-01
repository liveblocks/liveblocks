/* eslint-disable simple-import-sort/exports */
import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type {
  CommentBodySlotComponentProps,
  CommentBodyParagraphComponentProps,
  CommentBodyTextComponentProps,
  CommentBodyLinkComponentProps,
  CommentBodyMentionComponentProps,
  ConvertCommentBodyAsReactComponents,
  ConvertCommentBodyAsHTMLStyles,
} from "./comment-body";

export type {
  ResolveRoomInfoArgs,
  PrepareThreadNotificationEmailAsHTMLOptions,
  ThreadNotificationEmailDataAsHTML,
  PrepareThreadNotificationEmailAsReactOptions,
  ThreadNotificationEmailDataAsReact,
  CommentEmailAsHTMLData,
  CommentEmailAsReactData,
} from "./thread-notification";
export {
  prepareThreadNotificationEmailAsHTML,
  prepareThreadNotificationEmailAsReact,
} from "./thread-notification";
