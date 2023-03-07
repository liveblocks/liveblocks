import type { Editor, Point } from "slate";

export const EDITOR_TO_MERGING = new WeakMap<Editor, boolean | undefined>();
export const EDITOR_TO_LAST_TEXT_EDIT = new WeakMap<
  Editor,
  { position: Point; type: "insert_text" | "remove_text" } | undefined
>();
export const IS_APPLYING_HISTORY = new WeakMap<Editor, boolean>();
