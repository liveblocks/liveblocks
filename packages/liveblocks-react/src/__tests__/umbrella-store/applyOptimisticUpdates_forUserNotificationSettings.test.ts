import type {
  NotificationSettings,
  PartialNotificationSettings,
} from "@liveblocks/core";
import { createNotificationSettings, nanoid } from "@liveblocks/core";
import { describe, expect, test } from "vitest";

import { applyOptimisticUpdates_forNotificationSettings } from "../../umbrella-store";

describe("applyOptimisticUpdates_forNotificationSettings", () => {
  const defaultSettings: NotificationSettings = createNotificationSettings({
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

  test("should return the same object when no updates are provided", () => {
    const result = applyOptimisticUpdates_forNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-notification-settings",
          id: nanoid(),
          settings: {},
        },
      ]
    );
    expect(result).toEqual(defaultSettings);
  });

  test("should update a single property in a single channel", () => {
    const updates: PartialNotificationSettings = {
      email: { thread: true },
    };

    const result = applyOptimisticUpdates_forNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-notification-settings",
          id: nanoid(),
          settings: updates,
        },
      ]
    );

    expect(result.email!.thread).toBe(true);
    expect(result.email!.textMention).toBe(false);
    expect(result.email!.$fileUploaded).toBe(true);
    expect(result).not.toBe(defaultSettings); // Check immutability
  });

  test("should update multiple properties in a single channel", () => {
    const updates: PartialNotificationSettings = {
      email: {
        thread: true,
        textMention: true,
      },
    };

    const result = applyOptimisticUpdates_forNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-notification-settings",
          id: nanoid(),
          settings: updates,
        },
      ]
    );

    expect(result.email!.thread).toBe(true);
    expect(result.email!.textMention).toBe(true);
    expect(result.email!.$fileUploaded).toBe(true);
  });

  test("should update multiple channels simultaneously", () => {
    const updates: PartialNotificationSettings = {
      email: { thread: true },
      slack: { textMention: false },
    };

    const result = applyOptimisticUpdates_forNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-notification-settings",
          id: nanoid(),
          settings: updates,
        },
      ]
    );

    expect(result.email!.thread).toBe(true);
    expect(result.slack!.textMention).toBe(false);
    expect(result.webPush).toEqual(defaultSettings.webPush);
    expect(result.teams).toEqual(defaultSettings.teams);
  });

  test("should ignore undefined values in updates", () => {
    const updates: PartialNotificationSettings = {
      email: {
        thread: true,
        textMention: undefined,
        $fileUploaded: false,
      },
    };

    const result = applyOptimisticUpdates_forNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-notification-settings",
          id: nanoid(),
          settings: updates,
        },
      ]
    );

    expect(result.email!.thread).toBe(true);
    expect(result.email!.textMention).toBe(false);
    expect(result.email!.$fileUploaded).toBe(false);
  });

  test("should handle empty channel updates", () => {
    const updates: PartialNotificationSettings = {
      email: {},
    };

    const result = applyOptimisticUpdates_forNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-notification-settings",
          id: nanoid(),
          settings: updates,
        },
      ]
    );

    expect(result).toEqual(defaultSettings);
  });

  test("should preserve other channels when updating one", () => {
    const updates: PartialNotificationSettings = {
      email: { thread: true },
    };

    const result = applyOptimisticUpdates_forNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-notification-settings",
          id: nanoid(),
          settings: updates,
        },
      ]
    );

    expect(result.webPush).toEqual(defaultSettings.webPush);
    expect(result.slack).toEqual(defaultSettings.slack);
    expect(result.teams).toEqual(defaultSettings.teams);
  });

  test("should handle all boolean combinations", () => {
    const updates: PartialNotificationSettings = {
      email: {
        thread: true,
        textMention: false,
        $fileUploaded: false,
      },
    };

    const result = applyOptimisticUpdates_forNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-notification-settings",
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
