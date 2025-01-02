import type { DAD } from "../globals/augmentation";
import { values } from "../lib/utils";

/**
 * Pre-defined notification channels support list.
 */
export type NotificationChannel = "email" | "slack" | "teams" | "webPush";

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

/**
 * A channel notification setting is a set of notification kinds.
 * One setting can have multiple kinds (+ augmentation)
 */
export type ChannelNotificationSetting = {
  [K in NotificationKind]: boolean;
};

/**
 * Channels notification settings are a set of channel notification setting.
 * One channel for one setting.
 */
export type ChannelsNotificationSettings = {
  [C in NotificationChannel]: ChannelNotificationSetting;
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
 * with augmentation preserved gracefully
 */
export type PartialChannelsNotificationSettings =
  DeepPartialWithAugmentation<ChannelsNotificationSettings>;

/**
 *
 * Utility to check if a channel notification setting
 * is enabled for every notification kinds.
 */
export function isChannelNotificationSettingEnabled(
  setting: ChannelNotificationSetting
): boolean {
  return values(setting).every((enabled) => enabled === true);
}
