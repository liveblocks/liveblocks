import type { DAD } from "../globals/augmentation";

/**
 * Will later support other pre-defined channels
 * like `Slack` or `Teams`
 */
export type NotificationChannel = "email";

/**
 * `K` represents custom notification kinds
 * defined in the augmentation `ActivitiesData` (e.g `liveblocks.config.ts`).
 * It means the type `NotificationKind` will be shaped like:
 * thread | textMention | $customKind1 | $customKind2 | ...
 */
export type NotificationKind<K extends keyof DAD = keyof DAD> =
  | "thread"
  | "textMention"
  | K;

export type ChannelNotificationSettings = {
  [K in NotificationKind]: boolean;
};

export type ChannelsNotificationSettings = {
  [C in NotificationChannel]: ChannelNotificationSettings;
};

/**
 * It creates a deep partial specific for `ChannelsNotificationSettings`
 * to offer a nice DX when updating the settings (e.g not being forced to define every keys)
 * and at the same the some preserver the augmentation for custom kinds (e.g `liveblocks.config.ts`).
 */
type DeepPartialWithAugmentation<T> = T extends object
  ? {
      [P in keyof T]?: T[P] extends { [K in NotificationKind]: boolean }
        ? Partial<T[P]> & { [K in keyof DAD]?: boolean }
        : DeepPartialWithAugmentation<T[P]>;
    }
  : T;

/**
 * Partial channels notification settings
 * with augmentation preserved
 */
export type PartialChannelsNotificationSettings =
  DeepPartialWithAugmentation<ChannelsNotificationSettings>;
