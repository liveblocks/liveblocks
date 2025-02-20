import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version.js";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { CommentProps } from "./components/Comment.js";
export { Comment } from "./components/Comment.js";
export type { ComposerProps } from "./components/Composer.js";
export { Composer } from "./components/Composer.js";
export type { HistoryVersionSummaryProps } from "./components/HistoryVersionSummary.js";
export { HistoryVersionSummary } from "./components/HistoryVersionSummary.js";
export type { HistoryVersionSummaryListProps } from "./components/HistoryVersionSummaryList.js";
export { HistoryVersionSummaryList } from "./components/HistoryVersionSummaryList.js";
export type {
  InboxNotificationAvatarProps,
  InboxNotificationCustomKindProps,
  InboxNotificationCustomProps,
  InboxNotificationIconProps,
  InboxNotificationProps,
  InboxNotificationTextMentionKindProps,
  InboxNotificationTextMentionProps,
  InboxNotificationThreadKindProps,
  InboxNotificationThreadProps,
} from "./components/InboxNotification.js";
export { InboxNotification } from "./components/InboxNotification.js";
export type { InboxNotificationListProps } from "./components/InboxNotificationList.js";
export { InboxNotificationList } from "./components/InboxNotificationList.js";
export type { ThreadProps } from "./components/Thread.js";
export { Thread } from "./components/Thread.js";
export { LiveblocksUIConfig } from "./config.js";
export * as Icon from "./icon.js";
export type {
  CommentOverrides,
  ComposerOverrides,
  GlobalOverrides,
  InboxNotificationOverrides,
  LocalizationOverrides,
  Overrides,
  ThreadOverrides,
} from "./overrides.js";
export { useOverrides } from "./overrides.js";
export type { ComposerSubmitComment } from "./primitives.js";
export type {
  CommentAttachmentArgs,
  ComposerBodyMark,
  ComposerBodyMarks,
} from "./types.js";
