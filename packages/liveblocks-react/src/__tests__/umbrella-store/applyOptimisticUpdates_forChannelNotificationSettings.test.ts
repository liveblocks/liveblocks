import type {
  ChannelsNotificationSettings,
  PartialChannelsNotificationSettings,
} from "@liveblocks/core";
import { nanoid } from "@liveblocks/core";

import { applyOptimisticUpdates_forChannelNotificationSettings } from "../../umbrella-store";

describe("applyOptimisticUpdates_forChannelNotificationSettings", () => {
  const defaultSettings: ChannelsNotificationSettings = {
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
  };

  it("should return the same object when no updates are provided", () => {
    const result = applyOptimisticUpdates_forChannelNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-channels-notification-settings",
          id: nanoid(),
          settings: {},
        },
      ]
    );
    expect(result).toEqual(defaultSettings);
  });

  it("should update a single property in a single channel", () => {
    const updates: PartialChannelsNotificationSettings = {
      email: { thread: true },
    };

    const result = applyOptimisticUpdates_forChannelNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-channels-notification-settings",
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
    const updates: PartialChannelsNotificationSettings = {
      email: {
        thread: true,
        textMention: true,
      },
    };

    const result = applyOptimisticUpdates_forChannelNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-channels-notification-settings",
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
    const updates: PartialChannelsNotificationSettings = {
      email: { thread: true },
      slack: { textMention: false },
    };

    const result = applyOptimisticUpdates_forChannelNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-channels-notification-settings",
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
    const updates: PartialChannelsNotificationSettings = {
      email: {
        thread: true,
        textMention: undefined,
        $fileUploaded: false,
      },
    };

    const result = applyOptimisticUpdates_forChannelNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-channels-notification-settings",
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
    const updates: PartialChannelsNotificationSettings = {
      email: {},
    };

    const result = applyOptimisticUpdates_forChannelNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-channels-notification-settings",
          id: nanoid(),
          settings: updates,
        },
      ]
    );

    expect(result).toEqual(defaultSettings);
  });

  it("should preserve other channels when updating one", () => {
    const updates: PartialChannelsNotificationSettings = {
      email: { thread: true },
    };

    const result = applyOptimisticUpdates_forChannelNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-channels-notification-settings",
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
    const updates: PartialChannelsNotificationSettings = {
      email: {
        thread: true,
        textMention: false,
        $fileUploaded: false,
      },
    };

    const result = applyOptimisticUpdates_forChannelNotificationSettings(
      defaultSettings,
      [
        {
          type: "update-channels-notification-settings",
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
