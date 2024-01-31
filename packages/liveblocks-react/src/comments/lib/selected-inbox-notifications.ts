import type {
  BaseMetadata,
  CacheState,
  InboxNotificationData,
} from "@liveblocks/core";
import { applyOptimisticUpdates } from "@liveblocks/core";

export function selectedInboxNotifications<
  TThreadMetadata extends BaseMetadata,
>(state: CacheState<TThreadMetadata>): InboxNotificationData[] {
  const result = applyOptimisticUpdates(state);

  return Object.values(result.inboxNotifications);
}
