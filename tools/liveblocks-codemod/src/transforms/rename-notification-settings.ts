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

    /**
     * Before: room.getNotificationSettings()
     *  After: room.getSubscriptionSettings()
     */
    root
      .find(j.MemberExpression)
      .filter(
        (path) =>
          path.node.property.type === "Identifier" &&
          path.node.property.name === "getNotificationSettings"
      )
      .forEach((path) => {
        if (path.node.property.type === "Identifier") {
          path.node.property.name = "getSubscriptionSettings";

          isDirty = true;
        }
      });

    /**
     * Before: room.updateNotificationSettings({})
     *  After: room.updateSubscriptionSettings({})
     */
    root
      .find(j.MemberExpression)
      .filter(
        (path) =>
          path.node.property.type === "Identifier" &&
          path.node.property.name === "updateNotificationSettings"
      )
      .forEach((path) => {
        if (path.node.property.type === "Identifier") {
          path.node.property.name = "updateSubscriptionSettings";

          isDirty = true;
        }
      });
  }

  return isDirty ? root.toSource(options) : file.source;
}
