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
  let liveblocksProviderName: string | null = null;

  /**
   * Before: import LiveblocksProvider from "@liveblocks/yjs"
   *  After: import { LiveblocksYjsProvider } from "@liveblocks/yjs"
   */
  root.find(j.ImportDeclaration).forEach((path) => {
    if (path.node.source.value === "@liveblocks/yjs") {
      const defaultSpecifier = path.node.specifiers.find(
        (specifier) => specifier.type === "ImportDefaultSpecifier"
      );

      if (defaultSpecifier) {
        liveblocksProviderName = nameOf(defaultSpecifier.local);

        const newSpecifiers = path.node.specifiers.map((specifier) =>
          specifier.type === "ImportDefaultSpecifier"
            ? j.importSpecifier(j.identifier("LiveblocksYjsProvider"))
            : specifier
        );

        j(path).replaceWith(
          j.importDeclaration(newSpecifiers, j.literal("@liveblocks/yjs"))
        );

        isDirty = true;
      }
    }
  });

  /**
   * Before: new LiveblocksProvider()
   *  After: new LiveblocksYjsProvider()
   */
  if (liveblocksProviderName) {
    root.find(j.NewExpression).forEach((path) => {
      if (
        path.node.callee.type === "Identifier" &&
        path.node.callee.name === liveblocksProviderName
      ) {
        j(path).replaceWith(
          j.newExpression(
            j.identifier("LiveblocksYjsProvider"),
            path.node.arguments
          )
        );

        isDirty = true;
      }
    });
  }

  return isDirty ? root.toSource(options) : file.source;
}
