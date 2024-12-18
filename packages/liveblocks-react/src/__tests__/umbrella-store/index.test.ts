import { kInternal } from "@liveblocks/core";

import { ThreadDB } from "../../ThreadDB";
import { UmbrellaStore } from "../../umbrella-store";

const empty1 = {
  cleanedNotifications: [],
  notificationsById: {},
  threadsDB: expect.any(ThreadDB),
} as const;

const empty2 = {
  settingsByRoomId: {},
  versionsByRoomId: {},
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
    expect(store.get1()).toEqual(empty1);
    expect(store.get2()).toEqual(empty2);

    // Sync async-results getters
    expect(store.getInboxNotificationsLoadingState()).toEqual(loading);
    expect(store.getNotificationSettingsLoadingState("room-a")).toEqual(
      loading
    );
    expect(store.getRoomVersionsLoadingState("room-a")).toEqual(loading);
  });

  it("calling getters multiple times should always return a stable result", () => {
    const store = new UmbrellaStore(NO_CLIENT);

    // IMPORTANT! Strict equality expected!
    expect(store.get1()).toBe(store.get1());

    // Sync async-results getter
    // TODO Add check here for strict-equality of the OK-state, which currently isn't strictly-equal and the selectors/isEqual functions are still "working around" that
    expect(store.getInboxNotificationsLoadingState()).toBe(
      store.getInboxNotificationsLoadingState()
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
