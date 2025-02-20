import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version.js";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type {
  CommentBodyContainerComponentProps,
  CommentBodyLinkComponentProps,
  CommentBodyMentionComponentProps,
  CommentBodyParagraphComponentProps,
  CommentBodyTextComponentProps,
  ConvertCommentBodyAsHtmlStyles,
  ConvertCommentBodyAsReactComponents,
} from "./comment-body.js";
export type { ResolveRoomInfoArgs } from "./lib/types.js";
export type {
  ConvertTextEditorNodesAsHtmlStyles,
  ConvertTextEditorNodesAsReactComponents,
  TextEditorContainerComponentProps,
  TextEditorMentionComponentProps,
  TextEditorTextComponentProps,
} from "./liveblocks-text-editor.js";
export type {
  MentionEmailAsHtmlData,
  MentionEmailAsReactData,
  PrepareTextMentionNotificationEmailAsHtmlOptions,
  PrepareTextMentionNotificationEmailAsReactOptions,
  TextMentionNotificationEmailDataAsHtml,
  TextMentionNotificationEmailDataAsReact,
} from "./text-mention-notification.js";
export {
  prepareTextMentionNotificationEmailAsHtml,
  prepareTextMentionNotificationEmailAsReact,
} from "./text-mention-notification.js";
export type {
  CommentEmailAsHtmlData,
  CommentEmailAsReactData,
  PrepareThreadNotificationEmailAsHtmlOptions,
  PrepareThreadNotificationEmailAsReactOptions,
  ThreadNotificationEmailDataAsHtml,
  ThreadNotificationEmailDataAsReact,
} from "./thread-notification.js";
export {
  prepareThreadNotificationEmailAsHtml,
  prepareThreadNotificationEmailAsReact,
} from "./thread-notification.js";
export type { ResolveUsersArgs } from "@liveblocks/core";
