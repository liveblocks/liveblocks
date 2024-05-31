import type { API, FileInfo, Options } from "jscodeshift";

// Based on https://github.com/vercel/next.js/blob/main/packages/next-codemod

// TODO: Handle `package.json`?
// TODO: Also handle CommentsConfig → LiveblocksUiConfig

export default function transformer(
  file: FileInfo,
  api: API,
  options: Options
) {
  const j = api.jscodeshift.withParser("tsx");
  const root = j(file.source);

  /**
   * "@liveblocks/react-comments" imports
   */

  // Before: import { Thread } from "@liveblocks/react-comments"
  //  After: import { Thread } from "@liveblocks/react-ui"
  root
    .find(j.ImportDeclaration, {
      source: { value: "@liveblocks/react-comments" },
    })
    .forEach((importDeclaration) => {
      importDeclaration.node.source = j.stringLiteral("@liveblocks/react-ui");
    });

  // Before: const { Thread } = await import("@liveblocks/react-comments")
  //  After: const { Thread } = await import("@liveblocks/react-ui")
  root.find(j.AwaitExpression).forEach((awaitExp) => {
    const arg = awaitExp.value.argument;
    if (arg?.type === "CallExpression" && arg.callee.type === "Import") {
      if (
        arg.arguments[0].type === "StringLiteral" &&
        arg.arguments[0].value === "@liveblocks/react-comments"
      ) {
        arg.arguments[0] = j.stringLiteral("@liveblocks/react-ui");
      }
    }
  });

  // Before: const { Thread } = require("@liveblocks/react-comments")
  //  After: const { Thread } = require("@liveblocks/react-ui")
  root.find(j.CallExpression).forEach((requireExp) => {
    if (
      requireExp?.value?.callee?.type === "Identifier" &&
      requireExp.value.callee.name === "require"
    ) {
      const firstArg = requireExp.value.arguments[0];
      if (
        firstArg &&
        firstArg.type === "StringLiteral" &&
        firstArg.value === "@liveblocks/react-comments"
      ) {
        requireExp.value.arguments[0] = j.stringLiteral("@liveblocks/react-ui");
      }
    }
  });

  /**
   * "@liveblocks/react-comments/primitives" imports
   */

  // Before: import { Thread } from "@liveblocks/react-comments/primitives"
  //  After: import { Thread } from "@liveblocks/react-ui/primitives"
  root
    .find(j.ImportDeclaration, {
      source: { value: "@liveblocks/react-comments/primitives" },
    })
    .forEach((importDeclaration) => {
      importDeclaration.node.source = j.stringLiteral(
        "@liveblocks/react-ui/primitives"
      );
    });

  // Before: const { Thread } = await import("@liveblocks/react-comments/primitives")
  //  After: const { Thread } = await import("@liveblocks/react-ui/primitives")
  root.find(j.AwaitExpression).forEach((awaitExp) => {
    const arg = awaitExp.value.argument;
    if (arg?.type === "CallExpression" && arg.callee.type === "Import") {
      if (
        arg.arguments[0].type === "StringLiteral" &&
        arg.arguments[0].value === "@liveblocks/react-comments/primitives"
      ) {
        arg.arguments[0] = j.stringLiteral("@liveblocks/react-ui/primitives");
      }
    }
  });

  // Before: const { Thread } = require("@liveblocks/react-comments/primitives")
  //  After: const { Thread } = require("@liveblocks/react-ui/primitives")
  root.find(j.CallExpression).forEach((requireExp) => {
    if (
      requireExp?.value?.callee?.type === "Identifier" &&
      requireExp.value.callee.name === "require"
    ) {
      const firstArg = requireExp.value.arguments[0];
      if (
        firstArg &&
        firstArg.type === "StringLiteral" &&
        firstArg.value === "@liveblocks/react-comments/primitives"
      ) {
        requireExp.value.arguments[0] = j.stringLiteral(
          "@liveblocks/react-ui/primitives"
        );
      }
    }
  });

  // Learn more about renaming an import declaration here:
  // https://www.codeshiftcommunity.com/docs/import-manipulation/#replacerename-an-import-declaration

  return root.toSource(options);
}
