import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type {
  CommentBodyContainerComponentProps,
  CommentBodyLinkComponentProps,
  CommentBodyMentionComponentProps,
  CommentBodyParagraphComponentProps,
  CommentBodyTextComponentProps,
  ConvertCommentBodyAsHtmlStyles,
  ConvertCommentBodyAsReactComponents,
} from "./comment-body";
export type { ResolveRoomInfoArgs } from "./lib/types";
export type {
  ConvertTextEditorNodesAsHtmlStyles,
  ConvertTextEditorNodesAsReactComponents,
  TextEditorContainerComponentProps,
  TextEditorMentionComponentProps,
  TextEditorTextComponentProps,
} from "./liveblocks-text-editor";
export type {
  MentionEmailAsHtmlData,
  MentionEmailAsReactData,
  PrepareTextMentionNotificationEmailAsHtmlOptions,
  PrepareTextMentionNotificationEmailAsReactOptions,
  TextMentionNotificationEmailDataAsHtml,
  TextMentionNotificationEmailDataAsReact,
} from "./text-mention-notification";
export {
  prepareTextMentionNotificationEmailAsHtml,
  prepareTextMentionNotificationEmailAsReact,
} from "./text-mention-notification";
export type {
  CommentEmailAsHtmlData,
  CommentEmailAsReactData,
  PrepareThreadNotificationEmailAsHtmlOptions,
  PrepareThreadNotificationEmailAsReactOptions,
  ThreadNotificationEmailDataAsHtml,
  ThreadNotificationEmailDataAsReact,
} from "./thread-notification";
export {
  prepareThreadNotificationEmailAsHtml,
  prepareThreadNotificationEmailAsReact,
} from "./thread-notification";
export type { ResolveUsersArgs } from "@liveblocks/core";
