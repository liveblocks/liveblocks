import {
  applyOptimisticUpdates,
  type BaseMetadata,
  nn,
  type RoomNotificationSettings,
  type UmbrellaStoreState,
} from "@liveblocks/core";

export function selectNotificationSettings<M extends BaseMetadata>(
  roomId: string,
  state: UmbrellaStoreState<M>
): RoomNotificationSettings {
  const { notificationSettings } = applyOptimisticUpdates(state);
  return nn(notificationSettings[roomId]);
}
