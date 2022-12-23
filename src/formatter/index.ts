import ast, { Node } from "../ast";
import colors from "colors";
import { indentIfMultiLine } from "../lib/indent";

const INDENT_WIDTH = 2;

export function format(
  node: (Node | string | number) | (Node | string | number)[]
): string {
  if (Array.isArray(node)) {
    const lines = node.map((n) => format(n)).join(",\n");
    return indentIfMultiLine(INDENT_WIDTH, lines, "[ ", " ]", "[\n", "\n]");
  }

  if (
    node &&
    typeof node !== "string" &&
    typeof node !== "number" &&
    typeof node._kind === "string"
  ) {
    // Make literals at the leafs less verbose / more readable
    if (ast.isLiteral(node)) {
      return `${colors.yellow(node._kind)} ${format(node.value)}`;
    } else if (ast.isComment(node) && node.range) {
      return `${colors.yellow(node._kind)} ${format(node.text)} ${colors.gray(
        `/* ${node.range.join("-")} */`
      )}`;
    }

    const { _kind, ...rest } = node;
    const lines = Object.keys(rest)
      .filter((key) => key !== "range")
      .map(
        (key) =>
          `${colors.white(key)} =${indentIfMultiLine(
            2,
            format(
              // @ts-expect-error
              rest[key]
            ),
            " ",
            "",
            "\n",
            ""
          )}`
      )
      .join("\n");

    return `${colors.yellow(`${_kind}`)} ${indentIfMultiLine(
      INDENT_WIDTH,
      lines,
      "{ ",
      " }",
      "{\n",
      "\n}"
    )}`;
  }

  return colors.magenta(JSON.stringify(node, null, 2));
}
