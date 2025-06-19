import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { ResolveRoomInfoArgs } from "./lib/types";
export type {
  ConvertTextEditorNodesAsHtmlStyles,
  ConvertTextEditorNodesAsReactComponents,
  MentionEmailAsHtmlData,
  MentionEmailAsReactData,
  PrepareTextMentionNotificationEmailAsHtmlOptions,
  PrepareTextMentionNotificationEmailAsReactOptions,
  TextEditorContainerComponentProps,
  TextEditorMentionComponentProps,
  TextEditorTextComponentProps,
  TextMentionNotificationEmailDataAsHtml,
  TextMentionNotificationEmailDataAsReact,
} from "./text-mention-notification";
export {
  prepareTextMentionNotificationEmailAsHtml,
  prepareTextMentionNotificationEmailAsReact,
} from "./text-mention-notification";
export type {
  CommentBodyContainerComponentProps,
  CommentBodyLinkComponentProps,
  CommentBodyMentionComponentProps,
  CommentBodyParagraphComponentProps,
  CommentBodyTextComponentProps,
  CommentEmailAsHtmlData,
  CommentEmailAsReactData,
  ConvertCommentBodyAsHtmlStyles,
  ConvertCommentBodyAsReactComponents,
  PrepareThreadNotificationEmailAsHtmlOptions,
  PrepareThreadNotificationEmailAsReactOptions,
  ThreadNotificationEmailDataAsHtml,
  ThreadNotificationEmailDataAsReact,
} from "./thread-notification";
export {
  prepareThreadNotificationEmailAsHtml,
  prepareThreadNotificationEmailAsReact,
} from "./thread-notification";
export type { ResolveGroupsInfoArgs, ResolveUsersArgs } from "@liveblocks/core";
