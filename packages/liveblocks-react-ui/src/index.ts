import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { CommentProps } from "./components/Comment";
export { Comment } from "./components/Comment";
export type { ComposerProps } from "./components/Composer";
export { Composer } from "./components/Composer";
export type { HistoryVersionSummaryProps } from "./components/HistoryVersionSummary";
export { HistoryVersionSummary } from "./components/HistoryVersionSummary";
export type { HistoryVersionSummaryListProps } from "./components/HistoryVersionSummaryList";
export { HistoryVersionSummaryList } from "./components/HistoryVersionSummaryList";
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
} from "./components/InboxNotification";
export { InboxNotification } from "./components/InboxNotification";
export type { InboxNotificationListProps } from "./components/InboxNotificationList";
export { InboxNotificationList } from "./components/InboxNotificationList";
export type { ThreadProps } from "./components/Thread";
export { Thread } from "./components/Thread";
export { LiveblocksUIConfig } from "./config";
export type {
  CommentOverrides,
  ComposerOverrides,
  GlobalOverrides,
  InboxNotificationOverrides,
  LocalizationOverrides,
  Overrides,
  ThreadOverrides,
} from "./overrides";
export { useOverrides } from "./overrides";
export type { ComposerSubmitComment } from "./primitives";
export { Timestamp } from "./primitives/Timestamp";
export { useMentionSuggestions } from "./shared";
