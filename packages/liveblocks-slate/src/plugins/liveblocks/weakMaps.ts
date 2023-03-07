import type { Editor } from "slate";
import type { PendingChange } from "./types";

export const EDITOR_TO_LOCAL: WeakMap<Editor, boolean> = new WeakMap();
export const EDITOR_TO_REMOTE: WeakMap<Editor, boolean> = new WeakMap();
export const EDITOR_TO_UNSUBSCRIBE: WeakMap<Editor, () => void> = new WeakMap();
export const EDITOR_TO_PENDING_CHANGES: WeakMap<Editor, PendingChange[]> =
  new WeakMap();
