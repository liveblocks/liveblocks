import type { API, FileInfo, Options } from "jscodeshift";

// Based on https://github.com/vercel/next.js/blob/main/packages/next-codemod

// Helper to pull a string name off an Identifier-ish AST node.
//
// Why this exists: ast-types types `IdentifierKind["name"]` as
// `string | IdentifierKind` because `TSTypeParameter.name` can be either —
// Babel (what jscodeshift uses) emits a string, TS's own compiler emits an
// Identifier node, and the type union covers both. At runtime we never hit the
// non-string branch because our call sites only touch `.name` on Identifier /
// JSXIdentifier nodes (Import/Export specifiers, non-qualified TSTypeReference
// typeNames). The helper narrows away the type-only `IdentifierKind` case and
// throws if it's ever encountered — that would be either an unexpected AST
// shape or a new misuse of the helper.
function nameOf(id: { name: unknown }): string;
function nameOf(id: { name: unknown } | null | undefined): string | undefined;
function nameOf(id: { name: unknown } | null | undefined): string | undefined {
  if (id === null || id === undefined) return undefined;
  const n = id.name;
  if (typeof n !== "string") {
    throw new Error(
      `Expected Identifier with string name, got: ${JSON.stringify(id)}`
    );
  }
  return n;
}

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
          sourceNames.includes(nameOf(specifier.imported))
        ) {
          typeNamesToChange.push(
            nameOf(specifier.local) ?? nameOf(specifier.imported)
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
          typeNamesToChange.includes(nameOf(path.node.typeName))
      )
      .replaceWith((path) =>
        j.tsTypeReference(path.node.typeName /* no typeParameters */)
      );

    isDirty = true;
  }

  return isDirty ? root.toSource(options) : file.source;
}
