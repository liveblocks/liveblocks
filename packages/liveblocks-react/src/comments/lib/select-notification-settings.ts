import type { BaseMetadata, RoomNotificationSettings } from "@liveblocks/core";
import { nn } from "@liveblocks/core";

import type { UmbrellaStoreState } from "../../umbrella-store";
import { applyOptimisticUpdates } from "../../umbrella-store";

export function selectNotificationSettings<M extends BaseMetadata>(
  roomId: string,
  state: UmbrellaStoreState<M>
): RoomNotificationSettings {
  const { notificationSettings } = applyOptimisticUpdates(state);
  return nn(notificationSettings[roomId]);
}
