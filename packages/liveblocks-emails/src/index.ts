import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type {
  CommentBodyContainerComponentProps,
  CommentBodyLinkComponentProps,
  CommentBodyMentionComponentProps,
  CommentBodyParagraphComponentProps,
  CommentBodyTextComponentProps,
  ConvertCommentBodyAsHTMLStyles,
  ConvertCommentBodyAsReactComponents,
} from "./comment-body";
export type {
  CommentEmailAsHTMLData,
  CommentEmailAsReactData,
  PrepareThreadNotificationEmailAsHTMLOptions,
  PrepareThreadNotificationEmailAsReactOptions,
  ResolveRoomInfoArgs,
  ThreadNotificationEmailDataAsHTML,
  ThreadNotificationEmailDataAsReact,
} from "./thread-notification";
export {
  prepareThreadNotificationEmailAsHTML,
  prepareThreadNotificationEmailAsReact,
} from "./thread-notification";
