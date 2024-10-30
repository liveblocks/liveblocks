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
export type {
  ConvertLiveblocksTextEditorNodesAsReactComponents,
  LiveblocksTextEditorContainerComponentProps,
  LiveblocksTextEditorMentionComponentProps,
  LiveblocksTextEditorTextComponentProps,
} from "./liveblocks-text-editor";
export type {
  MentionEmailAsReactData,
  PrepareTextMentionNotificationEmailAsReactOptions,
  TextMentionNotificationEmailDataAsReact,
} from "./text-mention-notification";
export { prepareTextMentionNotificationEmailAsReact } from "./text-mention-notification";
export type {
  CommentEmailAsHtmlData,
  CommentEmailAsReactData,
  PrepareThreadNotificationEmailAsHtmlOptions,
  PrepareThreadNotificationEmailAsReactOptions,
  // TODO: create a common shared type once thread notification are publicly released.
  ResolveRoomInfoArgs,
  ThreadNotificationEmailDataAsHtml,
  ThreadNotificationEmailDataAsReact,
} from "./thread-notification";
export {
  prepareThreadNotificationEmailAsHtml,
  prepareThreadNotificationEmailAsReact,
} from "./thread-notification";
export type { ResolveUsersArgs } from "@liveblocks/core";
