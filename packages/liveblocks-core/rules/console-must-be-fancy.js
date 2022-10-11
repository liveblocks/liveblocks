module.exports = {
  meta: {
    messages: {
      addMissingImport:
        "Don't use `console` directly. To fix: `import * as console from './fancy-console'` in this module.",
    },
  },

  create(context) {
    let seenFancyImport = false;

    return {
      ImportDeclaration(node) {
        if (node.source.value.includes("fancy-console")) {
          seenFancyImport = true;
        }
      },

      CallExpression(node) {
        if (node.callee.object?.name === "console" && !seenFancyImport) {
          context.report({ node: node.callee, messageId: "addMissingImport" });
        }
      },
    };
  },
};
