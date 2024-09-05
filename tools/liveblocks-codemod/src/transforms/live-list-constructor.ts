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

  const sources = ["@liveblocks/core", "@liveblocks/client"];
  const identifiersToChange = [];

  root.find(j.ImportDeclaration).forEach((path) => {
    if (sources.includes(path.node.source.value as string)) {
      path.node.specifiers.forEach((specifier) => {
        if (
          specifier.type === "ImportSpecifier" &&
          specifier.imported.name === "LiveList"
        ) {
          identifiersToChange.push(
            specifier.local?.name ?? specifier.imported.name
          );
        }
      });
    }
  });

  /**
   * Before: new LiveList()
   *  After: new LiveList([])
   */
  if (identifiersToChange.length > 0) {
    root.find(j.NewExpression).forEach((path) => {
      if (
        path.node.callee.type === "Identifier" &&
        identifiersToChange.includes(path.node.callee.name)
      ) {
        if (path.node.arguments.length === 0) {
          j(path).replaceWith(
            j.newExpression(path.node.callee, [j.arrayExpression([])])
          );
        }

        isDirty = true;
      }
    });
  }

  return isDirty ? root.toSource(options) : file.source;
}
