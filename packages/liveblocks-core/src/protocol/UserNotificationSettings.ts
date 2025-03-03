import type { DAD } from "../globals/augmentation";
import * as console from "../lib/fancy-console";
import { create, entries, keys, values } from "../lib/utils";

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
 * Plain means it's a simple object coming from the remote backend.
 *
 * It's the raw settings object where somme channels cannot exists
 * because there are no notification kinds enabled on the dashboard.
 * And this object isn't yet proxied by the creator factory `createUserNotificationSettings`.
 */
export type UserNotificationSettingsPlain = {
  [C in NotificationChannel]?: NotificationChannelSettings;
};

/**
 * @internal
 *
 * Symbol to branch plain value of user notification settings
 * inside  the UserNotificationSettings object.
 */
const kPlain = Symbol("user-notification-settings-plain");

/**
 * @internal
 * Proxied `UserNotificationSettingsPlain` object.
 */
type ProxiedUserNotificationSettings = UserNotificationSettingsPlain;

/**
 * User notification settings.
 * One channel for one set of settings.
 */
export type UserNotificationSettings = {
  [C in NotificationChannel]: NotificationChannelSettings | null;
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
 * Partial user notification settings with augmentation preserved gracefully.
 * It means you can update the settings without being forced to define every keys.
 * Useful when implementing update functions.
 */
export type PartialUserNotificationSettings =
  DeepPartialWithAugmentation<UserNotificationSettingsPlain>;

/**
 * @private
 *
 * Creates a `UserNotificationSettings` object with the given initial plain settings.
 * It defines a getter for each channel to access the settings and returns `null` with an error log
 * in case the required channel isn't enabled in the dashboard.
 *
 * You can see this function as `Proxy` like around `UserNotificationSettingsPlain` type.
 * We can't predict what will be enabled on the dashboard or not, so it's important
 * provide a good DX to developers by returning `null` completed by an error log
 * when they try to access a channel that isn't enabled in the dashboard.
 */
export function createUserNotificationSettings(
  plain: UserNotificationSettingsPlain
): UserNotificationSettings {
  const channels: NotificationChannel[] = [
    "email",
    "slack",
    "teams",
    "webPush",
  ];
  const descriptors: PropertyDescriptorMap &
    ThisType<
      UserNotificationSettings & { [kPlain]: ProxiedUserNotificationSettings }
    > = {
    [kPlain]: {
      value: plain,
      enumerable: false,
    },
  };

  for (const channel of channels) {
    descriptors[channel] = {
      enumerable: true,
      /**
       * In the TypeScript standard library definitions, the built-in interface for a property descriptor
       * does not include a specialized type for the “this” context in the getter or setter functions.
       * As a result, both the ⁠get and ⁠set methods implicitly have ⁠this: any.
       * The reason is that property descriptors in JavaScript are used across various objects with
       * no enforced shape for ⁠this. And so the standard library definitions have to remain as broad as possible
       * to support any valid JavaScript usage (e.g `Object.defineProperty`).
       *
       * So we can safely tells that this getter is typed as `this: UserNotificationSettings` because we're
       * creating a well known shaped object → `UserNotificationSettings`.
       */
      get(
        this: UserNotificationSettings & {
          [kPlain]: ProxiedUserNotificationSettings;
        }
      ): NotificationChannelSettings | null {
        const value = this[kPlain][channel];
        if (typeof value === "undefined") {
          console.error(
            `In order to use the '${channel}' channel, please set up your project first. For more information: https://liveblocks.io/docs/errors/enable-a-notification-channel`
          );
          return null;
        }
        return value;
      },
    };
  }

  return create<UserNotificationSettings>(null, descriptors);
}

/**
 * @private
 *
 * Patch a `UserNotificationSettings` object by applying notification kind updates
 * coming from a `PartialUserNotificationSettings` object.
 */
export function patchUserNotificationSettings(
  existing: UserNotificationSettings,
  patch: PartialUserNotificationSettings
): UserNotificationSettings {
  // Create a copy of the settings object to mutate
  const outcoming = createUserNotificationSettings({
    ...(
      existing as UserNotificationSettings & {
        [kPlain]: ProxiedUserNotificationSettings;
      }
    )[kPlain],
  });

  for (const channel of keys(patch)) {
    const updates = patch[channel];
    if (updates !== undefined) {
      const kindUpdates = Object.fromEntries(
        entries(updates).filter(([, value]) => value !== undefined)
      ) as NotificationChannelSettings; // Fine to type cast here because we've filtered out undefined values

      (
        outcoming as UserNotificationSettings & {
          [kPlain]: ProxiedUserNotificationSettings;
        }
      )[kPlain][channel] = {
        ...(
          outcoming as UserNotificationSettings & {
            [kPlain]: ProxiedUserNotificationSettings;
          }
        )[kPlain][channel],
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
 *
 * Usage:
 * ```ts
 * const isEmailChannelEnabled = isNotificationChannelEnabled(settings.email);
 * ```
 */
export function isNotificationChannelEnabled(
  settings: NotificationChannelSettings | null
): boolean {
  return settings !== null
    ? values(settings).every((enabled) => enabled === true)
    : false;
}
