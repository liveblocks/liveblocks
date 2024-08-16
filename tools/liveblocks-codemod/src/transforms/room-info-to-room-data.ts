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
  let isRoomInfoImported = false;

  /**
   * Before: import { RoomInfo } from "@liveblocks/node"
   *  After: import { RoomData } from "@liveblocks/node"
   */
  root.find(j.ImportDeclaration).forEach((path) => {
    if (path.node.source.value === "@liveblocks/node") {
      path.node.specifiers.forEach((specifier) => {
        if (
          specifier.type === "ImportSpecifier" &&
          specifier.imported.name === "RoomInfo"
        ) {
          specifier.imported.name = "RoomData";

          isRoomInfoImported = true;
          isDirty = true;
        }
      });
    }
  });

  /**
   * Before: const rooms: RoomInfo[] = []
   *  After: const rooms: RoomData[] = []
   */
  if (isRoomInfoImported) {
    root
      .find(j.TSTypeReference)
      .filter(
        (path) =>
          path.node.typeName.type !== "TSQualifiedName" &&
          path.node.typeName.name === "RoomInfo"
      )
      .replaceWith((path) =>
        j.tsTypeReference(j.identifier("RoomData"), path.node.typeParameters)
      );

    isDirty = true;
  }

  return isDirty ? root.toSource(options) : file.source;
}
