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
  let isLiveblocksUiConfigImported = false;

  /**
   * Before: import { LiveblocksUIConfig } from "@liveblocks/react-ui"
   *  After: import { LiveblocksUiConfig } from "@liveblocks/react-ui"
   */
  root
    .find(j.ImportDeclaration, {
      source: { value: "@liveblocks/react-ui" },
    })
    .forEach((importDeclaration) => {
      importDeclaration.node.specifiers.forEach((specifier) => {
        if (
          specifier.type === "ImportSpecifier" &&
          specifier.imported.name === "LiveblocksUIConfig"
        ) {
          specifier.imported.name = "LiveblocksUiConfig";

          if (specifier.local.name === "LiveblocksUIConfig") {
            specifier.local.name = "LiveblocksUiConfig";
          }

          isLiveblocksUiConfigImported = true;
          isDirty = true;
        }
      });
    });

  /**
   * Before: <LiveblocksUIConfig />
   *  After: <LiveblocksUiConfig />
   */
  if (isLiveblocksUiConfigImported) {
    root
      .find(j.JSXIdentifier, { name: "LiveblocksUIConfig" })
      .replaceWith(j.jsxIdentifier("LiveblocksUiConfig"));

    isDirty = true;
  }

  return isDirty ? root.toSource(options) : file.source;
}
