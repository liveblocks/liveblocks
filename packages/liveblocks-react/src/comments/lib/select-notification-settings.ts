import {
  applyOptimisticUpdates,
  type BaseMetadata,
  type CacheState,
  nn,
  type RoomNotificationSettings,
} from "@liveblocks/core";

export function selectNotificationSettings<
  TThreadMetadata extends BaseMetadata,
>(
  roomId: string,
  state: CacheState<TThreadMetadata>
): RoomNotificationSettings {
  const { notificationSettings } = applyOptimisticUpdates(state);
  return nn(notificationSettings[roomId]);
}
