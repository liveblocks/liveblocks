import type {
  PartialUserNotificationSettings,
  UserNotificationSettings,
} from "@liveblocks/core";
import { createUserNotificationSettings, nanoid } from "@liveblocks/core";

import { applyOptimisticUpdates_forUserNotificationSettings } from "../../umbrella-store";

describe("applyOptimisticUpdates_forUserNotificationSettings", () => {
  const defaultSettings: UserNotificationSettings =
    createUserNotificationSettings({
      email: {
        thread: false,
        textMention: false,
        $fileUploaded: true,
      },
      webPush: {
        thread: true,
        textMention: true,
        $fileUploaded: true,
      },
      slack: {
        thread: true,
        textMention: true,
        $fileUploaded: true,
      },
      teams: {
        thread: true,
        textMention: true,
        $fileUploaded: true,
      },
    });

  it("should return the same object when no updates are provided", () => {
    const result = applyOptimisticUpdates_forUserNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-user-notification-settings",
          id: nanoid(),
          settings: {},
        },
      ]
    );
    expect(result).toEqual(defaultSettings);
  });

  it("should update a single property in a single channel", () => {
    const updates: PartialUserNotificationSettings = {
      email: { thread: true },
    };

    const result = applyOptimisticUpdates_forUserNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-user-notification-settings",
          id: nanoid(),
          settings: updates,
        },
      ]
    );

    expect(result.email.thread).toBe(true);
    expect(result.email.textMention).toBe(false);
    expect(result.email.$fileUploaded).toBe(true);
    expect(result).not.toBe(defaultSettings); // Check immutability
  });

  it("should update multiple properties in a single channel", () => {
    const updates: PartialUserNotificationSettings = {
      email: {
        thread: true,
        textMention: true,
      },
    };

    const result = applyOptimisticUpdates_forUserNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-user-notification-settings",
          id: nanoid(),
          settings: updates,
        },
      ]
    );

    expect(result.email.thread).toBe(true);
    expect(result.email.textMention).toBe(true);
    expect(result.email.$fileUploaded).toBe(true);
  });

  it("should update multiple channels simultaneously", () => {
    const updates: PartialUserNotificationSettings = {
      email: { thread: true },
      slack: { textMention: false },
    };

    const result = applyOptimisticUpdates_forUserNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-user-notification-settings",
          id: nanoid(),
          settings: updates,
        },
      ]
    );

    expect(result.email.thread).toBe(true);
    expect(result.slack.textMention).toBe(false);
    expect(result.webPush).toEqual(defaultSettings.webPush);
    expect(result.teams).toEqual(defaultSettings.teams);
  });

  it("should ignore undefined values in updates", () => {
    const updates: PartialUserNotificationSettings = {
      email: {
        thread: true,
        textMention: undefined,
        $fileUploaded: false,
      },
    };

    const result = applyOptimisticUpdates_forUserNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-user-notification-settings",
          id: nanoid(),
          settings: updates,
        },
      ]
    );

    expect(result.email.thread).toBe(true);
    expect(result.email.textMention).toBe(false);
    expect(result.email.$fileUploaded).toBe(false);
  });

  it("should handle empty channel updates", () => {
    const updates: PartialUserNotificationSettings = {
      email: {},
    };

    const result = applyOptimisticUpdates_forUserNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-user-notification-settings",
          id: nanoid(),
          settings: updates,
        },
      ]
    );

    expect(result).toEqual(defaultSettings);
  });

  it("should preserve other channels when updating one", () => {
    const updates: PartialUserNotificationSettings = {
      email: { thread: true },
    };

    const result = applyOptimisticUpdates_forUserNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-user-notification-settings",
          id: nanoid(),
          settings: updates,
        },
      ]
    );

    expect(result.webPush).toEqual(defaultSettings.webPush);
    expect(result.slack).toEqual(defaultSettings.slack);
    expect(result.teams).toEqual(defaultSettings.teams);
  });

  it("should handle all boolean combinations", () => {
    const updates: PartialUserNotificationSettings = {
      email: {
        thread: true,
        textMention: false,
        $fileUploaded: false,
      },
    };

    const result = applyOptimisticUpdates_forUserNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-user-notification-settings",
          id: nanoid(),
          settings: updates,
        },
      ]
    );

    expect(result.email).toEqual({
      thread: true,
      textMention: false,
      $fileUploaded: false,
    });
  });
});
