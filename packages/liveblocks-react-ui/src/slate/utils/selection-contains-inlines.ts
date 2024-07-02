import type { Node } from "slate";
import { Editor, Element, Range } from "slate";

export function selectionContainsInlines(
  editor: Editor,
  match: (node: Node) => boolean
) {
  const { selection } = editor;
  if (!selection) {
    return false;
  }

  const roots = Array.from(
    Editor.nodes(editor, {
      at: selection,
      match: (node) => Element.isElement(node) && Editor.isBlock(editor, node),
      mode: "lowest",
    })
  );

  for (const [, rootPath] of roots) {
    const intersectingSelection = Range.isRange(selection)
      ? Range.intersection(selection, Editor.range(editor, rootPath))
      : selection;

    if (!intersectingSelection) {
      continue;
    }

    const matches = Array.from(
      Editor.nodes(editor, {
        at: intersectingSelection,
        match: (node) =>
          Editor.isInline(editor, node as Element) && match(node),
      })
    );

    if (matches.length > 0) {
      return true;
    }
  }

  return false;
}
