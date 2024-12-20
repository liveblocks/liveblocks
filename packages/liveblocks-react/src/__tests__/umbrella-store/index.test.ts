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
    expect(store.get1_threads()).toEqual(expect.any(ThreadDB));
    expect(store.get1_notifications()).toEqual(empty1n);
    expect(store.get2()).toEqual({}); // settings by room ID
    expect(store.get3()).toEqual({}); // versions by room ID

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
    expect(store.get1_threads()).toBe(store.get1_threads());
    expect(store.get1_notifications()).toBe(store.get1_notifications());

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
