import type { DAD } from "../globals/augmentation";
import { kInternal } from "../internal";
import { entries, keys, raise, values } from "../lib/utils";

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
 * @private
 *
 * Base definition of user notification settings.
 * One channel for one set of settings.
 *
 * Plain means it's a simple object with no methods or private properties.
 */
export type UserNotificationSettingsPlain = {
  [C in NotificationChannel]: NotificationChannelSettings;
};

/**
 * @private
 *
 * Private properties and methods internal to `UserNotificationSettings`.
 * As a user of Liveblocks, you should nNEVER USE ANY OF THESE DIRECTLY,
 * because bad things will happen.
 */
export type PrivateNotificationChannelSettingsApi = {
  __plain__: Partial<UserNotificationSettingsPlain>;
};

/**
 * User notification settings.
 */
export type UserNotificationSettings = UserNotificationSettingsPlain & {
  /**
   * @private
   *
   * `UserNotificationSettings` with private internal properties to store the raw settings
   * and methods to mutate the object
   */
  [kInternal]: PrivateNotificationChannelSettingsApi;
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
  DeepPartialWithAugmentation<UserNotificationSettingsPlain>;

/**
 * @private
 *
 * Creates a `UserNotificationSettings` object with the given initial settings.
 * It defines getters for each channel to access the settings and throws and error
 * in case the required channel isn't enabled in the dashboard.
 */
export function createUserNotificationSettings(
  initial: Partial<UserNotificationSettingsPlain>
): UserNotificationSettings {
  const channels: NotificationChannel[] = [
    "email",
    "slack",
    "teams",
    "webPush",
  ];
  const descriptors: PropertyDescriptorMap = {
    [kInternal]: {
      value: {
        __plain__: initial,
      },
      enumerable: false,
    },
  };

  for (const channel of channels) {
    descriptors[channel] = {
      enumerable: true,
      get(this: UserNotificationSettings) {
        const value = this[kInternal].__plain__[channel];
        if (!value) {
          raise(
            `In order to use the '${channel}' channel, please set up your project first. See <link to docs>`
          );
        }
        return value;
      },
    };
  }

  return Object.create({}, descriptors) as UserNotificationSettings;
}

/**
 * @private
 *
 * Patch a `UserNotificationSettings` object by applying kind updates
 * coming from a `PartialUserNotificationSettings` object.
 */
export function patchUserNotificationSettings(
  existing: UserNotificationSettings,
  patch: PartialUserNotificationSettings
): UserNotificationSettings {
  // Create a copy of the settings object to mutate
  const outcoming = createUserNotificationSettings({
    ...existing[kInternal].__plain__,
  });

  for (const channel of keys(patch)) {
    const updates = patch[channel];
    if (updates !== undefined) {
      const kindUpdates = Object.fromEntries(
        entries(updates).filter(([, value]) => value !== undefined)
      ) as NotificationChannelSettings; // Fine to type cast here because we've filtered out undefined values

      outcoming[kInternal].__plain__[channel] = {
        ...outcoming[kInternal].__plain__[channel],
        ...kindUpdates,
      };
    }
  }

  return outcoming;
}

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
