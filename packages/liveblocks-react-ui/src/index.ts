import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type {
  AiChatComponents,
  AiChatComponentsEmptyProps,
  AiChatComponentsLoadingProps,
  AiChatProps,
} from "./components/AiChat";
export { AiChat } from "./components/AiChat";
export type { AiToolIconProps, AiToolProps } from "./components/AiTool";
export { AiTool } from "./components/AiTool";
export type { AvatarStackProps } from "./components/AvatarStack";
export { AvatarStack } from "./components/AvatarStack";
export type {
  CommentDropdownItemProps,
  CommentProps,
} from "./components/Comment";
export { Comment } from "./components/Comment";
export type { ComposerProps } from "./components/Composer";
export { Composer } from "./components/Composer";
export type { FloatingComposerProps } from "./components/FloatingComposer";
export { FloatingComposer } from "./components/FloatingComposer";
export type { FloatingThreadProps } from "./components/FloatingThread";
export { FloatingThread } from "./components/FloatingThread";
export type { HistoryVersionSummaryProps } from "./components/HistoryVersionSummary";
export { HistoryVersionSummary } from "./components/HistoryVersionSummary";
export type { HistoryVersionSummaryListProps } from "./components/HistoryVersionSummaryList";
export { HistoryVersionSummaryList } from "./components/HistoryVersionSummaryList";
export type {
  InboxNotificationAvatarProps,
  InboxNotificationCustomKindProps,
  InboxNotificationCustomProps,
  InboxNotificationIconProps,
  InboxNotificationInspectorProps,
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
export { LiveblocksUiConfig } from "./config";
export * as Icon from "./icon";
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
export type {
  AiComposerSubmitMessage,
  ComposerSubmitComment,
} from "./primitives";
export type {
  CommentAttachmentArgs,
  ComposerBodyMark,
  ComposerBodyMarks,
} from "./types";
