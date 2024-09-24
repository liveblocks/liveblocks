/* eslint-disable simple-import-sort/exports */
import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export type {
  PrepareThreadNotificationEmailAsHTMLOptions,
  ThreadNotificationEmailAsHTML,
} from "./thread-notification";
export { prepareThreadNotificationEmailAsHTML } from "./thread-notification";
