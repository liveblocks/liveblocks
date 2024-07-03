import type { Node, Text } from "slate";

export function isText(element: Node): element is Text {
  return (
    !("type" in element) &&
    "text" in element &&
    typeof element.text === "string"
  );
}

export function isPlainText(node: Node): boolean {
  return isText(node) && Object.keys(node).length === 1;
}
