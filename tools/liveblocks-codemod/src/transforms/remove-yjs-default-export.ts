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
        liveblocksProviderName = defaultSpecifier.local.name;

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
