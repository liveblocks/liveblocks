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

    case "StringType":
      return "string";

    case "NumberType":
      return "number";

    case "BooleanType":
      return "boolean";

    case "NullType":
      return "null";

    case "ObjectTypeDefinition":
      return [
        node.leadingComment !== null ? `# ${node.leadingComment}` : null,
        `type ${prettify(node.name)} {`,
        ...node.fields.map((field) => `  ${prettify(field)}`),
        "}",
      ]
        .filter((line) => line !== null)
        .join("\n");

    case "ObjectLiteralType":
      return `{ ${node.fields.map(prettify).join(", ")} }`;

    case "ArrayType":
      if (node.ofType._kind === "UnionType") {
        return `(${prettify(node.ofType)})[]`;
      } else {
        return `${prettify(node.ofType)}[]`;
      }

    case "LiveListType":
      return `LiveList<${prettify(node.ofType)}>`;

    case "LiveMapType":
      return `LiveMap<${prettify(node.keyType)}, ${prettify(node.valueType)}>`;

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

    case "UnionType":
      return node.members.map((member) => prettify(member)).join(" | ");

    default:
      return assertNever(node, `Please define prettify for «${node}» nodes`);
  }
}
