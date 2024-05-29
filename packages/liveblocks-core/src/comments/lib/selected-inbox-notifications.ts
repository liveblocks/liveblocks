import { BaseMetadata } from "../../protocol/Comments";
import { InboxNotificationData } from "../../protocol/InboxNotifications";
import { CacheState, applyOptimisticUpdates } from "../../store";

export function selectedInboxNotifications<M extends BaseMetadata>(
  state: CacheState<M>
): InboxNotificationData[] {
  const result = applyOptimisticUpdates(state);

  return Object.values(result.inboxNotifications).sort(
    // Sort so that the most recent notifications are first
    (a, b) => b.notifiedAt.getTime() - a.notifiedAt.getTime()
  );
}
