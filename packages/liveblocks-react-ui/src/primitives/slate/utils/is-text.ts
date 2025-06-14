import type { Node as SlateNode, Text as SlateText } from "slate";

export function isText(element: SlateNode): element is SlateText {
  return (
    !("type" in element) &&
    "text" in element &&
    typeof element.text === "string"
  );
}

export function isPlainText(node: SlateNode): boolean {
  return isText(node) && Object.keys(node).length === 1;
}
