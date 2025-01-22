import type { LexicalEditor, TextFormatType } from "lexical";
import { $getSelection, $isRangeSelection } from "lexical";

/**
 * Checks if a text format (e.g. bold, italic, …) is active in
 * the current selection.
 */
export function isTextFormatActive(
  editor: LexicalEditor,
  format: TextFormatType
) {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection) || selection.isCollapsed()) {
      return false;
    }

    return selection.hasFormat(format);
  });
}
