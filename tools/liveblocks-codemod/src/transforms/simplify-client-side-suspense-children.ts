import type { API, FileInfo, Options } from "jscodeshift";

// Babel tracks `(x)` source formatting via `node.extra.parenthesized`, but
// ast-types doesn't expose this field. Use a narrow typed-access helper.
function clearParenthesized(node: object): void {
  const extra = (node as { extra?: { parenthesized?: boolean } }).extra;
  if (extra?.parenthesized) {
    extra.parenthesized = false;
  }
}

export default function transform(
  file: FileInfo,
  api: API,
  options: Options
): string | undefined {
  const j = api.jscodeshift;
  const root = j(file.source);
  let isDirty = false;

  const sources = ["@liveblocks/react", "@liveblocks/react/suspense"];
  const identifiersToChange = [];

  root.find(j.ImportDeclaration).forEach((path) => {
    if (sources.includes(path.node.source.value as string)) {
      path.node.specifiers.forEach((specifier) => {
        if (
          specifier.type === "ImportSpecifier" &&
          specifier.imported.name === "ClientSideSuspense"
        ) {
          identifiersToChange.push(
            specifier.local?.name ?? specifier.imported.name
          );

          isDirty = true;
        }
      });
    }
  });

  // Find all JSXElements with name ClientSideSuspense
  root
    .find(j.JSXElement)
    .filter((path) => {
      const node = path.node.openingElement.name;
      return (
        node.type === "JSXIdentifier" && identifiersToChange.includes(node.name)
      );
    })
    .forEach((path) => {
      j(path)
        .find(j.JSXExpressionContainer)
        .forEach((innerPath) => {
          const node = innerPath.node;

          // Check if the children of the JSXElement is a JSXExpressionContainer
          if (node.type === "JSXExpressionContainer") {
            // Check if the expression inside the JSXExpressionContainer is an ArrowFunctionExpression
            if (
              node.expression.type === "ArrowFunctionExpression" &&
              node.expression.body.type !== "BlockStatement"
            ) {
              // Replace the ArrowFunctionExpression with its body

              // First, remove any associated comments as well, because it will
              // break the markup
              if (node.expression.body.comments) {
                node.expression.body.comments = [];
              }

              const body = node.expression.body;

              // Clear Babel's `extra.parenthesized` marker (carried over from
              // the source `() => (<JSX/>)`). Without this, recast would
              // re-emit the parens at the new JSX-text insertion site, where
              // `(` and `)` would be rendered as literal DOM text.
              clearParenthesized(body);

              const newNode =
                body.type === "JSXElement" || body.type === "JSXFragment"
                  ? body
                  : j.jsxExpressionContainer(body);

              j(innerPath).replaceWith(newNode);

              isDirty = true;
            }
          }
        });
    });

  return isDirty ? root.toSource(options) : file.source;
}
