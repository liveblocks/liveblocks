import type { Node } from "../ast";
import { assertNever } from "../lib/assert";

// function escape(value: string, chars: RegExp): string {
//   return value.replace(chars, "\\$1");
// }

// function quoteSingle(value: string): string {
//   return "'" + escape(value, /(['\n\\\t])/g) + "'";
// }

// function quoteDouble(value: string): string {
//   return '"' + escape(value, /(["\n\\\t])/g) + '"';
// }

/**
 * This provides a one-line prettification (summary) the node.
 */
export function prettify(node: Node): string {
  switch (node._kind) {
    case "Document":
      return node.definitions.map(prettify).join("\n\n");

    case "BooleanType":
      return "Boolean";

    case "StringType":
      return "String";

    case "IntType":
      return "Int";

    case "FloatType":
      return "Float";

    case "ObjectTypeDefinition":
      return [
        node.leadingComment !== null ? `# ${node.leadingComment}` : null,
        `type ${prettify(node.name)} {`,
        ...node.fields.map((field) => `  ${prettify(field)}`),
        "}",
      ]
        .filter((line) => line !== null)
        .join("\n");

    case "ObjectLiteralExpr":
      return `{ ${node.fields.map(prettify).join(", ")} }`;

    case "ArrayExpr":
      return `${prettify(node.of)}[]`;

    case "LiveListExpr":
      return `LiveList<${prettify(node.of)}>`;

    case "Identifier":
      return node.name;

    case "TypeName":
      return node.name;

    case "TypeRef":
      return node.asLiveObject
        ? `LiveObject<${prettify(node.ref)}>`
        : prettify(node.ref);

    case "FieldDef":
      return [
        node.leadingComment !== null ? `\n# ${node.leadingComment}` : null,
        `${prettify(node.name)}${node.optional ? "?" : ""}: ${prettify(
          node.type
        )}${node.trailingComment ? ` # ${node.trailingComment}` : ""}`,
      ]
        .filter((line) => line !== null)
        .join("\n");

    default:
      return assertNever(node, `Please define prettify for «${node}» nodes`);
  }
}
