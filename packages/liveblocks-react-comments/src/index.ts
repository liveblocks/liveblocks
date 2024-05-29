import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type { CommentProps } from "./components/Comment";
export { Comment } from "./components/Comment";
export type { ComposerProps } from "./components/Composer";
export {
  Composer,
  OnComposerFocusCallbackContext,
} from "./components/Composer";
export type { InboxNotificationProps } from "./components/InboxNotification";
export { InboxNotification } from "./components/InboxNotification";
export type { InboxNotificationListProps } from "./components/InboxNotificationList";
export { InboxNotificationList } from "./components/InboxNotificationList";
export type { ThreadProps } from "./components/Thread";
export { Thread, IsThreadActiveCallbackContext } from "./components/Thread";
export { CommentsConfig } from "./config";
export type { ComposerSubmitComment } from "./primitives";
