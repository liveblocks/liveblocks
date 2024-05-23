import {
  applyOptimisticUpdates,
  type BaseMetadata,
  type CacheState,
  nn,
  type RoomNotificationSettings,
} from "@liveblocks/core";

export function selectNotificationSettings<
  M extends BaseMetadata,
>(
  roomId: string,
  state: CacheState<M>
): RoomNotificationSettings {
  const { notificationSettings } = applyOptimisticUpdates(state);
  return nn(notificationSettings[roomId]);
}
