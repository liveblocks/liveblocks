import type { API, FileInfo, Options } from "jscodeshift";
import path from "path";

// Based on https://github.com/vercel/next.js/blob/main/packages/next-codemod

const CONFIG_PATH_REGEX = /.*liveblocks(.*)?\.config(.*)?(\.(?:t|j)sx?)?/;

export default function transformer(
  file: FileInfo,
  api: API,
  options: Options
) {
  const j = api.jscodeshift.withParser("tsx");
  const root = j(file.source);
  let isDirty = false;
  const isConfig = CONFIG_PATH_REGEX.test(path.basename(file.path));
  // Can be used to reduce false positives
  const hasLiveblocksRelatedImport = root
    .find(j.ImportDeclaration)
    .some((path) => {
      const value = path.node.source.value;

      return typeof value === "string" && value.includes("liveblocks");
    });

  /**
   * @liveblocks/client
   */
  {
    let isRoomNotificationSettingsImported = false;
    let isUserNotificationSettingsImported = false;

    /**
     * Before: import { RoomNotificationSettings } from "@liveblocks/client"
     *  After: import { RoomSubscriptionSettings } from "@liveblocks/client"
     */
    root.find(j.ImportDeclaration).forEach((path) => {
      if (path.node.source.value === "@liveblocks/client") {
        path.node.specifiers.forEach((specifier) => {
          if (
            specifier.type === "ImportSpecifier" &&
            specifier.imported.name === "RoomNotificationSettings"
          ) {
            specifier.imported.name = "RoomSubscriptionSettings";

            isRoomNotificationSettingsImported = true;
            isDirty = true;
          }
        });
      }
    });

    /**
     * Before: const settings: RoomNotificationSettings = {}
     *  After: const settings: RoomSubscriptionSettings = {}
     */
    if (isRoomNotificationSettingsImported) {
      root
        .find(j.TSTypeReference)
        .filter(
          (path) =>
            path.node.typeName.type !== "TSQualifiedName" &&
            path.node.typeName.name === "RoomNotificationSettings"
        )
        .replaceWith((path) =>
          j.tsTypeReference(
            j.identifier("RoomSubscriptionSettings"),
            path.node.typeParameters
          )
        );

      isDirty = true;
    }

    /**
     * Before: import { UserNotificationSettings } from "@liveblocks/client"
     *  After: import { NotificationSettings } from "@liveblocks/client"
     */
    root.find(j.ImportDeclaration).forEach((path) => {
      if (path.node.source.value === "@liveblocks/client") {
        path.node.specifiers.forEach((specifier) => {
          if (
            specifier.type === "ImportSpecifier" &&
            specifier.imported.name === "UserNotificationSettings"
          ) {
            specifier.imported.name = "NotificationSettings";

            isUserNotificationSettingsImported = true;
            isDirty = true;
          }
        });
      }
    });

    /**
     * Before: const settings: UserNotificationSettings = {}
     *  After: const settings: NotificationSettings = {}
     */
    if (isUserNotificationSettingsImported) {
      root
        .find(j.TSTypeReference)
        .filter(
          (path) =>
            path.node.typeName.type !== "TSQualifiedName" &&
            path.node.typeName.name === "UserNotificationSettings"
        )
        .replaceWith((path) =>
          j.tsTypeReference(
            j.identifier("NotificationSettings"),
            path.node.typeParameters
          )
        );

      isDirty = true;
    }

    if (hasLiveblocksRelatedImport) {
      /**
       * Before: room.getNotificationSettings()
       *         room.updateNotificationSettings({})
       *  After: room.getSubscriptionSettings()
       *         room.updateSubscriptionSettings({})
       */
      root
        .find(j.CallExpression)
        .filter((path) => {
          const callee = path.node.callee;
          if (
            callee.type !== "MemberExpression" ||
            callee.property.type !== "Identifier" ||
            !(
              callee.property.name === "getNotificationSettings" ||
              callee.property.name === "updateNotificationSettings"
            )
          ) {
            return false;
          }

          // Even with the restriction of having Liveblocks-related imports,
          // there are still false positives like the Notification Settings APIs
          // on the client (e.g. `client.updateNotificationSettings`), to avoid them
          // we check that the method comes from something with "room" in its name.
          if (
            callee.object.type === "Identifier" &&
            callee.object.name.toLowerCase().includes("room")
          ) {
            return true;
          }

          return false;
        })
        .forEach((path) => {
          const callee = path.node.callee;
          if (
            callee.type === "MemberExpression" &&
            callee.property.type === "Identifier"
          ) {
            callee.property.name = callee.property.name.replace(
              "NotificationSettings",
              "SubscriptionSettings"
            );

            isDirty = true;
          }
        });
    }
  }

  /**
   * @liveblocks/react
   */
  {
    let isUseRoomNotificationSettingsImported = false;
    let isUseUpdateRoomNotificationSettingsImported = false;
    let isUseErrorListenerImported = false;

    /**
     * Before: import { useRoomNotificationSettings, useUpdateRoomNotificationSettings } from "@liveblocks/react"
     *         import { useRoomNotificationSettings, useUpdateRoomNotificationSettings } from "@liveblocks/react/suspense"
     *         import { useRoomNotificationSettings, useUpdateRoomNotificationSettings } from "liveblocks.config"
     *
     *  After: import { useRoomSubscriptionSettings, useUpdateRoomSubscriptionSettings } from "@liveblocks/react"
     *         import { useRoomSubscriptionSettings, useUpdateRoomSubscriptionSettings } from "@liveblocks/react/suspense"
     *         import { useRoomSubscriptionSettings, useUpdateRoomSubscriptionSettings } from "liveblocks.config"
     */
    root.find(j.ImportDeclaration).forEach((path) => {
      if (
        typeof path.node.source.value === "string" &&
        (path.node.source.value === "@liveblocks/react" ||
          path.node.source.value === "@liveblocks/react/suspense" ||
          CONFIG_PATH_REGEX.test(path.node.source.value))
      ) {
        path.node.specifiers.forEach((specifier) => {
          if (
            specifier.type === "ImportSpecifier" &&
            specifier.imported.name === "useRoomNotificationSettings"
          ) {
            specifier.imported.name = "useRoomSubscriptionSettings";

            isUseRoomNotificationSettingsImported = true;
            isDirty = true;
          }

          if (
            specifier.type === "ImportSpecifier" &&
            specifier.imported.name === "useUpdateRoomNotificationSettings"
          ) {
            specifier.imported.name = "useUpdateRoomSubscriptionSettings";

            isUseUpdateRoomNotificationSettingsImported = true;
            isDirty = true;
          }

          if (
            specifier.type === "ImportSpecifier" &&
            specifier.imported.name === "useErrorListener"
          ) {
            // No transform here, we're just checking if the import is present
            isUseErrorListenerImported = true;
          }
        });
      }
    });

    /**
     * Before: const [{ settings }] = useRoomNotificationSettings()
     *  After: const [{ settings }] = useRoomSubscriptionSettings()
     *
     * Before: const updateRoomNotificationSettings = useUpdateRoomNotificationSettings()
     *  After: const updateRoomSubscriptionSettings = useUpdateRoomSubscriptionSettings()
     */
    if (
      isUseRoomNotificationSettingsImported ||
      isUseUpdateRoomNotificationSettingsImported
    ) {
      root
        .find(j.CallExpression)
        .filter((path) => {
          const callee = path.node.callee;
          return (
            callee.type === "Identifier" &&
            (callee.name === "useRoomNotificationSettings" ||
              callee.name === "useUpdateRoomNotificationSettings")
          );
        })
        .forEach((path) => {
          const callee = path.node.callee;
          if (callee.type === "Identifier") {
            if (callee.name === "useRoomNotificationSettings") {
              callee.name = "useRoomSubscriptionSettings";
            } else if (callee.name === "useUpdateRoomNotificationSettings") {
              callee.name = "useUpdateRoomSubscriptionSettings";
            }

            isDirty = true;
          }
        });
    }

    /**
     * Before: useErrorListener((error) => console.log(error.context.type === "UPDATE_NOTIFICATION_SETTINGS_ERROR"))
     *  After: useErrorListener((error) => console.log(error.context.type === "UPDATE_ROOM_SUBSCRIPTION_SETTINGS_ERROR"))
     */
    if (isUseErrorListenerImported) {
      root
        .find(j.Literal, {
          value: "UPDATE_NOTIFICATION_SETTINGS_ERROR",
        })
        .forEach((path) => {
          j(path).replaceWith(
            j.literal("UPDATE_ROOM_SUBSCRIPTION_SETTINGS_ERROR")
          );

          isDirty = true;
        });
    }

    /**
     * Before: export const { useRoomNotificationSettings, useUpdateRoomNotificationSettings } = createRoomContext(client)
     *  After: export const { useRoomSubscriptionSettings, useUpdateRoomSubscriptionSettings } = createRoomContext(client)
     */
    if (isConfig) {
      root.find(j.Identifier).forEach((path) => {
        if (
          path.node.name === "useRoomNotificationSettings" ||
          path.node.name === "useUpdateRoomNotificationSettings"
        ) {
          path.node.name = path.node.name.replace(
            "NotificationSettings",
            "SubscriptionSettings"
          );

          isDirty = true;
        }
      });
    }
  }

  /**
   * @liveblocks/node
   */
  {
    if (hasLiveblocksRelatedImport) {
      /**
       * Before: liveblocks.getRoomNotificationSettings({})
       *         liveblocks.updateRoomNotificationSettings({})
       *         liveblocks.deleteRoomNotificationSettings({})
       *  After: liveblocks.getRoomSubscriptionSettings({})
       *         liveblocks.updateRoomSubscriptionSettings({})
       *         liveblocks.deleteRoomSubscriptionSettings({})
       */
      root
        .find(j.CallExpression)
        .filter((path) => {
          const callee = path.node.callee;
          return (
            callee.type === "MemberExpression" &&
            callee.property.type === "Identifier" &&
            [
              "getRoomNotificationSettings",
              "updateRoomNotificationSettings",
              "deleteRoomNotificationSettings",
            ].includes(callee.property.name)
          );
        })
        .forEach((path) => {
          const callee = path.node.callee;
          if (
            callee.type === "MemberExpression" &&
            callee.property.type === "Identifier"
          ) {
            callee.property.name = callee.property.name.replace(
              "NotificationSettings",
              "SubscriptionSettings"
            );

            isDirty = true;
          }
        });
    }
  }

  return isDirty ? root.toSource(options) : file.source;
}
