import type { Node } from "../ast";

function escape(value: string, chars: RegExp): string {
  return value.replace(chars, "\\$1");
}

// function quoteSingle(value: string): string {
//   return "'" + escape(value, /(['\n\\\t])/g) + "'";
// }

function quoteDouble(value: string): string {
  return '"' + escape(value, /(["\n\\\t])/g) + '"';
}

function assertNever(_value: never, msg: string): never {
  throw new Error(msg);
}

/**
 * This provides a one-line prettification (summary) the node.
 */
export function prettify(node: Node): string {
  switch (node._kind) {
    case "Document":
      return node.definitions.map(prettify).join("\n\n");

    case "ObjectTypeDef":
      return [
        `type ${prettify(node.name)} {`,
        ...node.obj.fields.map((field) => `  ${prettify(field)}`),
        "}",
      ].join("\n");

    case "ObjectLiteralExpr":
      return `{ ${node.fields.map(prettify).join(", ")} }`;

    case "Identifier":
      return node.name;

    case "TypeName":
      return node.name;

    case "FieldDef":
      return `${prettify(node.name)}${node.optional ? "?" : ""}: ${prettify(
        node.type
      )}`;

    case "TypeRef":
      return node.args.length > 0
        ? [`${prettify(node.name)}<`, ...node.args.map(prettify), ">"].join("")
        : prettify(node.name);

    // case "StringLiteral":
    //   return quoteDouble(node.value);

    case "LineComment":
      return `# ${node.text}`;

    default:
      return assertNever(node, `Please define prettify for «${node}» nodes`);
  }
}
