import type { DAD } from "../globals/augmentation.js";
import { values } from "../lib/utils.js";

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
 * A notification channel settings is a set of notification kinds.
 * One setting can have multiple kinds (+ augmentation)
 */
export type NotificationChannelSettings = {
  [K in NotificationKind]: boolean;
};

/**
 * User notification settings are a set of notification channel setting.
 * One channel for one set of settings.
 */
export type UserNotificationSettings = {
  [C in NotificationChannel]: NotificationChannelSettings;
};

/**
 * It creates a deep partial specific for `UserNotificationSettings`
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
 * Partial user notification settings
 * with augmentation preserved gracefully
 */
export type PartialUserNotificationSettings =
  DeepPartialWithAugmentation<UserNotificationSettings>;

/**
 *
 * Utility to check if a notification channel settings
 * is enabled for every notification kinds.
 */
export function isNotificationChannelEnabled(
  settings: NotificationChannelSettings
): boolean {
  return values(settings).every((enabled) => enabled === true);
}
