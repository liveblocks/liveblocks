import type { API, FileInfo, Options } from "jscodeshift";

// Based on https://github.com/vercel/next.js/blob/main/packages/next-codemod

export default function transformer(
  file: FileInfo,
  api: API,
  options: Options
) {
  const j = api.jscodeshift.withParser("tsx");
  const root = j(file.source);
  let isDirty = false;

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

    if (hasLiveblocksRelatedImport) {
      /**
       * Before: room.getNotificationSettings()
       *  After: room.getSubscriptionSettings()
       */
      root
        .find(j.CallExpression)
        .filter((path) => {
          const callee = path.node.callee;
          return (
            callee.type === "MemberExpression" &&
            callee.property.type === "Identifier" &&
            callee.property.name === "getNotificationSettings"
          );
        })
        .forEach((path) => {
          const callee = path.node.callee;
          if (
            callee.type === "MemberExpression" &&
            callee.property.type === "Identifier"
          ) {
            callee.property.name = "getSubscriptionSettings";

            isDirty = true;
          }
        });

      /**
       * Before: room.updateNotificationSettings({})
       *  After: room.updateSubscriptionSettings({})
       */
      root
        .find(j.CallExpression)
        .filter((path) => {
          const callee = path.node.callee;
          return (
            callee.type === "MemberExpression" &&
            callee.property.type === "Identifier" &&
            callee.property.name === "updateNotificationSettings"
          );
        })
        .forEach((path) => {
          const callee = path.node.callee;
          if (
            callee.type === "MemberExpression" &&
            callee.property.type === "Identifier"
          ) {
            callee.property.name = "updateSubscriptionSettings";

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
       *  After: liveblocks.getRoomSubscriptionSettings({})
       */
      root
        .find(j.CallExpression)
        .filter((path) => {
          const callee = path.node.callee;
          return (
            callee.type === "MemberExpression" &&
            callee.property.type === "Identifier" &&
            callee.property.name === "getRoomNotificationSettings"
          );
        })
        .forEach((path) => {
          const callee = path.node.callee;
          if (
            callee.type === "MemberExpression" &&
            callee.property.type === "Identifier"
          ) {
            callee.property.name = "getRoomSubscriptionSettings";

            isDirty = true;
          }
        });

      /**
       * Before: liveblocks.updateRoomNotificationSettings({})
       *  After: liveblocks.updateRoomSubscriptionSettings({})
       */
      root
        .find(j.CallExpression)
        .filter((path) => {
          const callee = path.node.callee;
          return (
            callee.type === "MemberExpression" &&
            callee.property.type === "Identifier" &&
            callee.property.name === "updateRoomNotificationSettings"
          );
        })
        .forEach((path) => {
          const callee = path.node.callee;
          if (
            callee.type === "MemberExpression" &&
            callee.property.type === "Identifier"
          ) {
            callee.property.name = "updateRoomSubscriptionSettings";

            isDirty = true;
          }
        });

      /**
       * Before: liveblocks.deleteRoomNotificationSettings({})
       *  After: liveblocks.deleteRoomSubscriptionSettings({})
       */
      root
        .find(j.CallExpression)
        .filter((path) => {
          const callee = path.node.callee;
          return (
            callee.type === "MemberExpression" &&
            callee.property.type === "Identifier" &&
            callee.property.name === "deleteRoomNotificationSettings"
          );
        })
        .forEach((path) => {
          const callee = path.node.callee;
          if (
            callee.type === "MemberExpression" &&
            callee.property.type === "Identifier"
          ) {
            callee.property.name = "deleteRoomSubscriptionSettings";

            isDirty = true;
          }
        });
    }
  }

  return isDirty ? root.toSource(options) : file.source;
}
