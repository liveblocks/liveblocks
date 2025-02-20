import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version.js";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { CommentProps } from "./components/Comment.jsx";
export { Comment } from "./components/Comment.jsx";
export type { ComposerProps } from "./components/Composer.jsx";
export { Composer } from "./components/Composer.jsx";
export type { HistoryVersionSummaryProps } from "./components/HistoryVersionSummary.jsx";
export { HistoryVersionSummary } from "./components/HistoryVersionSummary.jsx";
export type { HistoryVersionSummaryListProps } from "./components/HistoryVersionSummaryList.jsx";
export { HistoryVersionSummaryList } from "./components/HistoryVersionSummaryList.jsx";
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
} from "./components/InboxNotification.jsx";
export { InboxNotification } from "./components/InboxNotification.jsx";
export type { InboxNotificationListProps } from "./components/InboxNotificationList.jsx";
export { InboxNotificationList } from "./components/InboxNotificationList.jsx";
export type { ThreadProps } from "./components/Thread.jsx";
export { Thread } from "./components/Thread.jsx";
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
export type { ComposerSubmitComment } from "./primitives/index.js";
export type {
  CommentAttachmentArgs,
  ComposerBodyMark,
  ComposerBodyMarks,
} from "./types.js";
