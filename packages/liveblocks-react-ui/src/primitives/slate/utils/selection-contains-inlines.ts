import type { Node as SlateNode } from "slate";
import {
  Editor as SlateEditor,
  Element as SlateElement,
  Range as SlateRange,
} from "slate";

export function selectionContainsInlines(
  editor: SlateEditor,
  match: (node: SlateNode) => boolean
) {
  const { selection } = editor;
  if (!selection) {
    return false;
  }

  const roots = Array.from(
    SlateEditor.nodes(editor, {
      at: selection,
      match: (node) =>
        SlateElement.isElement(node) && SlateEditor.isBlock(editor, node),
      mode: "lowest",
    })
  );

  for (const [, rootPath] of roots) {
    const intersectingSelection = SlateRange.isRange(selection)
      ? SlateRange.intersection(selection, SlateEditor.range(editor, rootPath))
      : selection;

    if (!intersectingSelection) {
      continue;
    }

    const matches = Array.from(
      SlateEditor.nodes(editor, {
        at: intersectingSelection,
        match: (node) =>
          SlateEditor.isInline(editor, node as SlateElement) && match(node),
      })
    );

    if (matches.length > 0) {
      return true;
    }
  }

  return false;
}
