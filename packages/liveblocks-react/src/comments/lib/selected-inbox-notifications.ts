import type {
  BaseMetadata,
  InboxNotificationData,
  UmbrellaStoreState,
} from "@liveblocks/core";
import { applyOptimisticUpdates } from "@liveblocks/core";

export function selectedInboxNotifications<M extends BaseMetadata>(
  state: UmbrellaStoreState<M>
): InboxNotificationData[] {
  const result = applyOptimisticUpdates(state);

  return Object.values(result.inboxNotifications).sort(
    // Sort so that the most recent notifications are first
    (a, b) => b.notifiedAt.getTime() - a.notifiedAt.getTime()
  );
}
