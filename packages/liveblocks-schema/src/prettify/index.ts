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

    case "StringKeyword":
      return "String";

    case "IntKeyword":
      return "Int";

    case "FloatKeyword":
      return "Float";

    case "ObjectTypeDef":
      return [
        `type ${prettify(node.name)} {`,
        ...node.obj.fields.map((field) => `  ${prettify(field)}`),
        "}",
      ].join("\n");

    case "ObjectLiteralExpr":
      return `{ ${node.fields.map(prettify).join(", ")} }`;

    case "LiveObjectTypeExpr":
      return `LiveObject<${prettify(node.of)}>`;

    case "Identifier":
      return node.name;

    case "TypeRef":
      return prettify(node.name);

    case "FieldDef":
      return `${prettify(node.name)}${node.optional ? "?" : ""}: ${prettify(
        node.type
      )}`;

    // case "StringLiteral":
    //   return quoteDouble(node.value);

    case "LineComment":
      return `# ${node.text}`;

    default:
      return assertNever(node, `Please define prettify for «${node}» nodes`);
  }
}
