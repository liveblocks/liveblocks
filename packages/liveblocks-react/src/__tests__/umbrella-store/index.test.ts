import { UmbrellaStore } from "../../umbrella-store";

const empty = {
  inboxNotifications: [],
  inboxNotificationsById: {},
  notificationSettingsByRoomId: {},
  queries: {},
  threads: [],
  threadsById: {},
  versionsByRoomId: {},
} as const;

const loading = { isLoading: true };

describe("Umbrella Store", () => {
  it("getters returns the expected shapes", () => {
    const store = new UmbrellaStore();

    // Sync getters
    expect(store.getThreads()).toEqual(empty);

    // Sync async-results getters
    expect(store.getInboxNotificationsAsync()).toEqual(loading);
    expect(store.getNotificationSettingsAsync("room-a")).toEqual(loading);
    expect(store.getVersionsAsync("room-a")).toEqual(loading);
  });

  it("calling getters multiple times should always return a stable result", () => {
    const store = new UmbrellaStore();

    // IMPORTANT! Strict equality expected!
    expect(store.getThreads()).toBe(store.getThreads());

    // Sync async-results getter
    // XXX Add check here for strict-equality of the OK-state, which currently isn't strictly-equal and the selectors/isEqual functions are still "working around" that
    expect(store.getInboxNotificationsAsync()).toBe(
      store.getInboxNotificationsAsync()
    );
    // XXX Add check here for strict-equality of the OK-state, which currently isn't strictly-equal and the selectors/isEqual functions are still "working around" that
    expect(store.getNotificationSettingsAsync("room-a")).toBe(
      store.getNotificationSettingsAsync("room-a")
    );
    // XXX Add check here for strict-equality of the OK-state, which currently isn't strictly-equal and the selectors/isEqual functions are still "working around" that
    expect(store.getVersionsAsync("room-a")).toBe(
      store.getVersionsAsync("room-a")
    );
  });
});
