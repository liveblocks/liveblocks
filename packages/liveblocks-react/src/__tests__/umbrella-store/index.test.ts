import { kInternal } from "@liveblocks/core";

import { ThreadDB } from "../../ThreadDB";
import { UmbrellaStore } from "../../umbrella-store";

const empty = {
  cleanedNotifications: [],
  notificationsById: {},
  queries3: {},
  settingsByRoomId: {},
  threadsDB: expect.any(ThreadDB),
  versionsByRoomId: {},
} as const;

const NO_CLIENT = {
  [kInternal]: {
    as() {
      return NO_CLIENT;
    },
  },
} as any;

const loading = { isLoading: true };

describe("Umbrella Store", () => {
  it("getters returns the expected shapes", () => {
    const store = new UmbrellaStore(NO_CLIENT);

    // Sync getters
    expect(store.getFullState()).toEqual(empty);

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
    expect(store.getFullState()).toBe(store.getFullState());

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
