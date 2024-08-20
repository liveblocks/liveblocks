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
   * Matches: import { type User, User as U1 } from "@liveblocks/client";
   *          import { Room, type Room as R2 } from "@liveblocks/client";
   */
  const sourcePkgs = ["@liveblocks/core", "@liveblocks/client"];
  const sourceNames = [
    "Client",
    "ClientOptions",
    "CommentBodyMentionElementArgs",
    "OthersEvent",
    "Room",
    "StringifyCommentBodyElements",
    "ThreadData",
    "User",
  ];

  const typeNamesToChange: string[] = [];

  root.find(j.ImportDeclaration).forEach((path) => {
    if (sourcePkgs.includes(path.node.source.value as string)) {
      path.node.specifiers.forEach((specifier) => {
        if (
          specifier.type === "ImportSpecifier" &&
          sourceNames.includes(specifier.imported.name)
        ) {
          typeNamesToChange.push(
            specifier.local.name ?? specifier.imported.name
          );
        }
      });
    }
  });

  /**
   * Before: User<One, Two, Three>
   *  After: User
   */
  if (typeNamesToChange.length > 0) {
    root
      .find(j.TSTypeReference)
      .filter(
        (path) =>
          path.node.typeName.type !== "TSQualifiedName" &&
          typeNamesToChange.includes(path.node.typeName.name)
      )
      .replaceWith((path) =>
        j.tsTypeReference(path.node.typeName /* no typeParameters */)
      );

    isDirty = true;
  }

  return isDirty ? root.toSource(options) : file.source;
}
