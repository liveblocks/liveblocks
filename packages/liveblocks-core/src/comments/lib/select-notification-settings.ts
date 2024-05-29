import { nn } from "../../lib/assert";
import { BaseMetadata } from "../../protocol/Comments";
import { CacheState, applyOptimisticUpdates } from "../../store";
import { RoomNotificationSettings } from "../../types/RoomNotificationSettings";

export function selectNotificationSettings<M extends BaseMetadata>(
  roomId: string,
  state: CacheState<M>
): RoomNotificationSettings {
  const { notificationSettings } = applyOptimisticUpdates(state);
  return nn(notificationSettings[roomId]);
}
