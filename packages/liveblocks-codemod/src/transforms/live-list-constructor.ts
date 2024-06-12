import type { API, FileInfo, Options } from "jscodeshift";

// Based on https://github.com/vercel/next.js/blob/main/packages/next-codemod

export default function transformer(
  file: FileInfo,
  api: API,
  options: Options
) {
  const j = api.jscodeshift.withParser("tsx");
  const root = j(file.source);
  let isLiveListImported = false;

  root.find(j.ImportDeclaration).forEach((path) => {
    if (path.node.source.value === "@liveblocks/client") {
      path.node.specifiers.forEach((specifier) => {
        if (
          specifier.type === "ImportSpecifier" &&
          specifier.imported.name === "LiveList"
        ) {
          isLiveListImported = true;
        }
      });
    }
  });

  /**
   * Before: new LiveList()
   *  After: new LiveList([])
   */
  if (isLiveListImported) {
    root.find(j.NewExpression).forEach((path) => {
      if (
        path.node.callee.type === "Identifier" &&
        path.node.callee.name === "LiveList"
      ) {
        if (path.node.arguments.length === 0) {
          j(path).replaceWith(
            j.newExpression(path.node.callee, [j.arrayExpression([])])
          );
        }
      }
    });
  }

  return root.toSource(options);
}
