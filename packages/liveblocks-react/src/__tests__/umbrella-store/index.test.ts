import { kInternal } from "@liveblocks/core";

import { ThreadDB } from "../../ThreadDB";
import { UmbrellaStore } from "../../umbrella-store";

const empty1n = {
  sortedNotifications: [],
  notificationsById: {},
} as const;

function makeSyncSource() {
  return {
    setPending: () => {},
    destroy: () => {},
  };
}

const NO_CLIENT = {
  [kInternal]: {
    as() {
      return NO_CLIENT;
    },
    createSyncSource: makeSyncSource,
  },
} as any;

const loading = { isLoading: true };

describe("Umbrella Store", () => {
  it("getters returns the expected shapes", () => {
    const store = new UmbrellaStore(NO_CLIENT);

    // Sync getters
    expect(store.outputs.threads.get()).toEqual(expect.any(ThreadDB));
    expect(store.outputs.notifications.get()).toEqual(empty1n);
    expect(store.outputs.settingsByRoomId.get()).toEqual({}); // settings by room ID
    expect(store.outputs.versionsByRoomId.get()).toEqual({}); // versions by room ID

    // Sync async-results getters
    expect(store.outputs.loadingNotifications.get()).toEqual(loading);
    expect(store.getNotificationSettingsLoadingState("room-a")).toEqual(
      loading
    );
    expect(store.getRoomVersionsLoadingState("room-a")).toEqual(loading);
  });

  it("calling getters multiple times should always return a stable result", () => {
    const store = new UmbrellaStore(NO_CLIENT);

    // IMPORTANT! Strict equality expected!
    expect(store.outputs.threads.get()).toBe(store.outputs.threads.get());
    expect(store.outputs.notifications.get()).toBe(
      store.outputs.notifications.get()
    );

    // Sync async-results getter
    expect(store.outputs.loadingNotifications.get()).toBe(
      store.outputs.loadingNotifications.get()
    );
    // TODO Add check here for strict-equality of the OK-state, which currently isn't strictly-equal and the selectors/isEqual functions are still "working around" that
    expect(store.getNotificationSettingsLoadingState("room-a")).toBe(
      store.getNotificationSettingsLoadingState("room-a")
    );
    // TODO Add check here for strict-equality of the OK-state, which currently isn't strictly-equal and the selectors/isEqual functions are still "working around" that
    expect(store.getRoomVersionsLoadingState("room-a")).toBe(
      store.getRoomVersionsLoadingState("room-a")
    );
  });
});
