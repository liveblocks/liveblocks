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

    expect(store.getThreads()).toEqual(empty);
    expect(store.getInboxNotifications()).toEqual(empty);
    expect(store.getNotificationSettings()).toEqual(empty);
    expect(store.getVersions()).toEqual(empty);
  });

  it("calling getters multiple times should always return a stable result", () => {
    const store = new UmbrellaStore();

    // IMPORTANT! Strict equality expected!
    expect(store.getThreads()).toBe(store.getThreads());
    expect(store.getInboxNotifications()).toBe(store.getInboxNotifications());
    expect(store.getNotificationSettings()).toBe(
      store.getNotificationSettings()
    );
    expect(store.getVersions()).toBe(store.getVersions());
  });
});
