import type { API, FileInfo, Options } from "jscodeshift";

// Based on https://github.com/vercel/next.js/blob/main/packages/next-codemod

const CONFIG_IMPORT_REGEX = /.*liveblocks(.*)?\.config(\.(?:t|j)sx?)?/;
const CONFIG_IMPORTS_REGEX = /^(Room|Liveblocks)?Provider|^use[A-Z]/;

export default function transformer(
  file: FileInfo,
  api: API,
  options: Options
) {
  const j = api.jscodeshift.withParser("tsx");
  const root = j(file.source);
  const isSuspense = (options as { suspense?: boolean }).suspense;

  /**
   * Before: import { RoomProvider } from "./liveblocks.config"
   *  After: import { RoomProvider } from "@liveblocks/react"
   */
  root
    .find(j.ImportDeclaration)
    .filter((path) => {
      return (
        path.value.source.type === "StringLiteral" &&
        CONFIG_IMPORT_REGEX.test(path.value.source.value)
      );
    })
    .forEach((path) => {
      const importSpecifiers = path.node.specifiers;
      const importsFromLiveblocksReact = importSpecifiers.filter((specifier) =>
        CONFIG_IMPORTS_REGEX.test(specifier.local.name)
      );
      const importsFromConfig = importSpecifiers.filter(
        (specifier) => !CONFIG_IMPORTS_REGEX.test(specifier.local.name)
      );

      if (importsFromLiveblocksReact.length > 0) {
        const liveblocksReactImport = j.importDeclaration(
          importsFromLiveblocksReact,
          j.stringLiteral(
            isSuspense ? "@liveblocks/react/suspense" : "@liveblocks/react"
          )
        );
        path.insertBefore(liveblocksReactImport);
      }

      if (importsFromConfig.length > 0) {
        const originalImport = j.importDeclaration(
          importsFromConfig,
          path.value.source
        );
        path.insertBefore(originalImport);
      }

      j(path).remove();
    });

  return root.toSource(options);
}
