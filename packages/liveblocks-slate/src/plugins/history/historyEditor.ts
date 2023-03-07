import { LiveblocksEditor } from "../liveblocks/liveblocksEditor";
import { EDITOR_TO_MERGING, IS_APPLYING_HISTORY } from "./weakMaps";

export type HistoryRequiredEditor = LiveblocksEditor;
export type HistoryEditor = HistoryRequiredEditor & {
  undo: () => void;
  redo: () => void;
};

export const HistoryEditor = {
  /**
   * Check if a value is a `HistoryEditor` object.
   */
  isHistoryEditor(v: unknown): v is HistoryEditor {
    if (!LiveblocksEditor.isLiveblocksEditor(v)) {
      return false;
    }

    const maybeHistoryEditor = v as Partial<HistoryEditor>;
    return (
      typeof maybeHistoryEditor.undo === "function" &&
      typeof maybeHistoryEditor.redo === "function"
    );
  },

  /**
   * Redo to the previous saved state.
   */
  redo(editor: HistoryEditor) {
    editor.redo();
  },

  /**
   * Undo to the previous saved state.
   */
  undo(editor: HistoryEditor) {
    editor.undo();
  },

  /**
   * Apply a series of changes inside a synchronous `fn`, without merging any of
   * the new operations into previous save point in the history.
   */
  withoutMerging(editor: HistoryEditor, fn: () => void) {
    const prev = EDITOR_TO_MERGING.get(editor);
    EDITOR_TO_MERGING.set(editor, false);
    fn();
    EDITOR_TO_MERGING.set(editor, prev);
  },

  /**
   * Get the merge flag's current value.
   */
  isMerging(editor: HistoryEditor): boolean | undefined {
    return EDITOR_TO_MERGING.get(editor);
  },

  /**
   * Get the current value of the applying history flag.
   */
  isApplyingHistory(editor: HistoryEditor): boolean {
    return IS_APPLYING_HISTORY.get(editor) ?? false;
  },

  /**
   * Perform the synchronous `fn` as if it were applying history =>
   * we try to guess the and select selection the user would have had
   * based upon the applied operations.
   */
  asApplyingHistory(editor: HistoryEditor, fn: () => void) {
    const prev = HistoryEditor.isApplyingHistory(editor);
    IS_APPLYING_HISTORY.set(editor, true);
    fn();
    IS_APPLYING_HISTORY.set(editor, prev);
  },
};
