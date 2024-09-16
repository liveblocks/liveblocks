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

describe("Umbrella Store", () => {
  it("getters returns the expected shapes", () => {
    const store = new UmbrellaStore();

    // Sync getters
    expect(store.getThreads()).toEqual(empty);
    expect(store.getNotificationSettings()).toEqual(empty);
    expect(store.getVersions()).toEqual(empty);

    // Sync async-results getters
    expect(store.getInboxNotificationsAsync()).toEqual(empty);
  });

  it("calling getters multiple times should always return a stable result", () => {
    const store = new UmbrellaStore();

    // IMPORTANT! Strict equality expected!
    expect(store.getThreads()).toBe(store.getThreads());
    expect(store.getNotificationSettings()).toBe(
      store.getNotificationSettings()
    );
    expect(store.getVersions()).toBe(store.getVersions());

    // Sync async-results getter
    expect(store.getInboxNotificationsAsync()).toBe(
      store.getInboxNotificationsAsync()
    );
  });
});
