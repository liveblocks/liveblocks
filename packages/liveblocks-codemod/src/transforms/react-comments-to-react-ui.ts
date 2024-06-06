import type { API, FileInfo, Options } from "jscodeshift";

// Based on https://github.com/vercel/next.js/blob/main/packages/next-codemod

// TODO: Handle `package.json`?

export default function transformer(
  file: FileInfo,
  api: API,
  options: Options
) {
  const j = api.jscodeshift.withParser("tsx");
  const root = j(file.source);
  let isCommentsConfigImported = false;

  /**
   * Before: import { Thread } from "@liveblocks/react-comments"
   *  After: import { Thread } from "@liveblocks/react-ui"
   */
  root
    .find(j.ImportDeclaration, {
      source: { value: "@liveblocks/react-comments" },
    })
    .forEach((importDeclaration) => {
      importDeclaration.node.source = j.stringLiteral("@liveblocks/react-ui");

      /**
       * Before: import { CommentsConfig } from "@liveblocks/react-comments"
       *  After: import { LiveblocksUIConfig } from "@liveblocks/react-ui"
       */
      importDeclaration.node.specifiers.forEach((specifier) => {
        if (
          specifier.type === "ImportSpecifier" &&
          specifier.imported.name === "CommentsConfig"
        ) {
          isCommentsConfigImported = true;
          specifier.imported.name = "LiveblocksUIConfig";

          if (specifier.local.name === "CommentsConfig") {
            specifier.local.name = "LiveblocksUIConfig";
          }
        }
      });
    });

  /**
   * Before: <CommentsConfig />
   *  After: <LiveblocksUIConfig />
   */
  if (isCommentsConfigImported) {
    root
      .find(j.JSXIdentifier, { name: "CommentsConfig" })
      .replaceWith(j.jsxIdentifier("LiveblocksUIConfig"));
  }

  /**
   * Before: import { Thread } from "@liveblocks/react-comments/primitives"
   *  After: import { Thread } from "@liveblocks/react-ui/primitives"
   */
  root
    .find(j.ImportDeclaration, {
      source: { value: "@liveblocks/react-comments/primitives" },
    })
    .forEach((importDeclaration) => {
      importDeclaration.node.source = j.stringLiteral(
        "@liveblocks/react-ui/primitives"
      );
    });

  /**
   * Before: import "@liveblocks/react-comments/styles.css"
   *  After: import "@liveblocks/react-ui/styles.css"
   */
  root.find(j.ImportDeclaration).forEach((path) => {
    if (path.node.type === "ImportDeclaration") {
      if (
        typeof path.node.source.value === "string" &&
        path.node.source.value.startsWith("@liveblocks/react-comments") &&
        path.node.source.value.endsWith(".css")
      ) {
        path.node.source.value = path.node.source.value.replace(
          "@liveblocks/react-comments",
          "@liveblocks/react-ui"
        );
      }
    }
  });

  return root.toSource(options);
}
