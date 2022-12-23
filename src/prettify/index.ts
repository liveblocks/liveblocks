import type { Node } from "../ast";

function escape(value: string, chars: RegExp): string {
  return value.replace(chars, "\\$1");
}

function _quoteSingle(value: string): string {
  return "'" + escape(value, /(['\n\\\t])/g) + "'";
}

function _quoteDouble(value: string): string {
  return '"' + escape(value, /(["\n\\\t])/g) + '"';
}

function _assertNever(_value: never, msg: string): never {
  throw new Error(msg);
}

/**
 * This provides a one-line prettification (summary) the node.
 */
export default function prettify(node: Node): string {
  switch (node._kind) {
    case "Document":
    case "FieldDef":
    case "Identifier":
    case "LineComment":
    case "ObjectTypeDef":
    case "ObjectTypeExpr":
    case "TypeName":
    default:
      return "// TODO: Implement me";
    // return assertNever(node, "Please define prettify for all node types");
  }
}
