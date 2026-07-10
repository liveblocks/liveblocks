import type { Room } from "@liveblocks/client";
import { kInternal } from "@liveblocks/core";
import { mergeRegister } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CLEAR_EDITOR_COMMAND,
  CLEAR_HISTORY_COMMAND,
  COLLABORATION_TAG,
  COMMAND_PRIORITY_EDITOR,
  type EditorState,
  HISTORIC_TAG,
  HISTORY_MERGE_TAG,
  HISTORY_PUSH_TAG,
  type LexicalEditor,
  PASTE_TAG,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical";

import type {
  DecodedLexicalSelection,
  LiveblocksCollaborationManager,
} from "./manager";
import type { LiveLexicalSelection } from "./types";

/**
 * Idle window for merging local edits into one `room.history` stack item.
 * Matches `@lexical/react` `useHistory` so Lexical users get familiar undo
 * granularity; Our CodeMirror implementation uses 500ms for the same Storage mechanism.
 */
const HISTORY_CAPTURE_TIMEOUT_MS = 1000;

/**
 * Selection snapshot in three coordinate systems.
 *
 * - `storage` — presence encoding (`encodeIndex` + LiveText.version). Survives
 *   Lexical node-key recreation, but after delete+undo `decodeIndex` can remap
 *   the left edge of a deleted range on a surviving LiveText.
 * - `lexical` — exact Lexical keys/offsets. Preferred when
 *   `$isUsableLexicalSnapshot` is true after historic reconcile.
 * - `local` — LiveText character offsets / element child indices *before*
 *   `encodeIndex`. Used when Lexical keys were recreated (common with
 *   multi-segment formatted text) so we can place the caret without going
 *   through the remapping `decodeIndex` path.
 */
export type HistorySelectionSnapshot = {
  storage: LiveLexicalSelection;
  lexical: DecodedLexicalSelection;
  local: LiveLexicalSelection;
};

type HistorySelectionEntry = {
  before: HistorySelectionSnapshot | null;
  after: HistorySelectionSnapshot | null;
};

export class LiveblocksHistory {
  readonly #editor: LexicalEditor;
  readonly #room: Room;
  readonly #manager: LiveblocksCollaborationManager;

  #captureTimer: ReturnType<typeof setTimeout> | null = null;
  /** True while we have called `pause()` and not yet committed via `resume()`. */
  #isCapturing = false;

  /**
   * Candidate "before" while idle (not capturing). Updated on selection-only
   * moves; ignored while a capture is open so mid-burst caret moves do not
   * overwrite the item's before.
   */
  #pendingBefore: HistorySelectionSnapshot | null = null;

  /** Locked when a capture opens — selection to restore on undo. */
  #before: HistorySelectionSnapshot | null = null;

  /** Latest selection during an open capture — selection to restore on redo. */
  #after: HistorySelectionSnapshot | null = null;

  /** Selection metadata keyed by private history stack item id. */
  readonly #historySelections = new Map<number, HistorySelectionEntry>();

  /**
   * One-shot restore target set on undo/redo. Sync reads and clears this
   * after applying history-driven Storage updates.
   */
  pendingRestore: HistorySelectionSnapshot | null = null;

  #unregister: (() => void) | null = null;

  constructor(
    editor: LexicalEditor,
    room: Room,
    manager: LiveblocksCollaborationManager
  ) {
    this.#editor = editor;
    this.#room = room;
    this.#manager = manager;
  }

  register(): void {
    if (this.#unregister !== null) {
      return;
    }

    this.#dispatchCanUndoRedoCommands();

    this.#unregister = mergeRegister(
      this.#editor.registerUpdateListener(
        ({
          editorState,
          prevEditorState,
          dirtyLeaves,
          dirtyElements,
          tags,
        }) => {
          if (tags.has(HISTORIC_TAG) || tags.has(COLLABORATION_TAG)) {
            return;
          }

          const hasDirtyNodes = dirtyLeaves.size > 0 || dirtyElements.size > 0;

          // Selection-only: no Storage mutation. Refresh idle before; leave
          // an open capture alone so a caret move does not split typing.
          if (!hasDirtyNodes) {
            if (!this.#isCapturing) {
              this.#pendingBefore = this.#encodeSelection(editorState);
            }
            return;
          }

          // Explicit merge: stay in the current item even across idle.
          if (tags.has(HISTORY_MERGE_TAG)) {
            this.#beginOrExtendCapture(editorState, prevEditorState);
            return;
          }

          // Hard boundaries: paste and explicit push always start a new item.
          const hardBoundary =
            tags.has(HISTORY_PUSH_TAG) || tags.has(PASTE_TAG);

          if (hardBoundary || !this.#isCapturing) {
            // `hardBoundary` while capturing: commit the previous item first.
            // `!capturing`: commitCapture is a no-op; we still open below.
            this.#commitCapture();
          }

          this.#beginOrExtendCapture(editorState, prevEditorState);
        }
      ),
      this.#editor.registerCommand(
        UNDO_COMMAND,
        () => {
          // Flush first — undo discards `pausedHistory`.
          this.#commitCapture();
          if (!this.#room.history.canUndo()) {
            return false;
          }
          this.#room.history.undo();
          this.#dispatchCanUndoRedoCommands();
          return true;
        },
        COMMAND_PRIORITY_EDITOR
      ),
      this.#editor.registerCommand(
        REDO_COMMAND,
        () => {
          this.#commitCapture();
          if (!this.#room.history.canRedo()) {
            return false;
          }
          this.#room.history.redo();
          this.#dispatchCanUndoRedoCommands();
          return true;
        },
        COMMAND_PRIORITY_EDITOR
      ),
      this.#editor.registerCommand(
        CLEAR_HISTORY_COMMAND,
        () => {
          this.#commitCapture();
          this.#room.history.clear();
          this.#dispatchCanUndoRedoCommands();
          return true;
        },
        COMMAND_PRIORITY_EDITOR
      ),
      this.#editor.registerCommand(
        CLEAR_EDITOR_COMMAND,
        () => {
          this.#commitCapture();
          this.#room.history.clear();
          this.#dispatchCanUndoRedoCommands();
          return false;
        },
        COMMAND_PRIORITY_EDITOR
      ),
      this.#room.subscribe("history", () => {
        this.#dispatchCanUndoRedoCommands();
      }),
      this.#room[kInternal].history.subscribe((event) => {
        switch (event.action) {
          case "push": {
            this.#historySelections.set(event.id, {
              before: this.#before,
              after: this.#after,
            });
            this.#before = null;
            this.#after = null;
            break;
          }
          case "undo": {
            const entry = this.#historySelections.get(event.id);
            this.pendingRestore = entry?.before ?? null;
            break;
          }
          case "redo": {
            const entry = this.#historySelections.get(event.id);
            this.pendingRestore = entry?.after ?? null;
            break;
          }
          case "discard": {
            for (const id of event.ids) {
              this.#historySelections.delete(id);
            }
            break;
          }
          case "clear": {
            this.#historySelections.clear();
            this.pendingRestore = null;
            break;
          }
        }
      }),
      () => {
        this.#commitCapture();
      }
    );
  }

  unregister(): void {
    this.#unregister?.();
    this.#unregister = null;
  }

  set pendingBefore(selection: HistorySelectionSnapshot | null) {
    this.#pendingBefore = selection;
  }

  #dispatchCanUndoRedoCommands(): void {
    this.#editor.dispatchCommand(
      CAN_UNDO_COMMAND,
      this.#room.history.canUndo()
    );
    this.#editor.dispatchCommand(
      CAN_REDO_COMMAND,
      this.#room.history.canRedo()
    );
  }

  #clearCaptureTimer(): void {
    if (this.#captureTimer === null) {
      return;
    }
    clearTimeout(this.#captureTimer);
    this.#captureTimer = null;
  }

  /**
   * Commit the open pause group onto the undo stack. Safe when history was
   * never paused (`resume` is a no-op on an empty paused buffer).
   *
   * Leaves `#before` / `#after` in place so the synchronous `push` event can
   * store them; that handler clears the pair.
   */
  #commitCapture(): void {
    this.#clearCaptureTimer();
    if (!this.#isCapturing) {
      return;
    }
    this.#isCapturing = false;
    // Next item's candidate before is where this item left the caret.
    if (this.#after !== null) {
      this.#pendingBefore = this.#after;
    }
    this.#room.history.resume();
  }

  #scheduleCommit(): void {
    this.#clearCaptureTimer();
    this.#captureTimer = setTimeout(() => {
      this.#captureTimer = null;
      this.#isCapturing = false;
      if (this.#after !== null) {
        this.#pendingBefore = this.#after;
      }
      this.#room.history.resume();
      this.#dispatchCanUndoRedoCommands();
    }, HISTORY_CAPTURE_TIMEOUT_MS);
  }

  /** Open or extend a paused history group and arm the idle commit timer. */
  #beginOrExtendCapture(
    editorState: EditorState,
    prevEditorState: EditorState | null
  ): void {
    if (!this.#isCapturing) {
      this.#before =
        this.#pendingBefore ?? this.#encodeSelection(prevEditorState);
    }

    this.#isCapturing = true;
    this.#after = this.#encodeSelection(editorState);
    this.#room.history.pause();
    this.#scheduleCommit();
  }

  #encodeSelection(
    editorState: EditorState | null
  ): HistorySelectionSnapshot | null {
    if (editorState === null) {
      return null;
    }
    if (this.#manager.binding.reverse.size === 0) {
      return null;
    }

    return editorState.read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return null;
      }
      const storageAnchor = this.#manager.$encodePoint(selection.anchor);
      const storageFocus = this.#manager.$encodePoint(selection.focus);
      const localAnchor = this.#manager.$encodeLocalPoint(selection.anchor);
      const localFocus = this.#manager.$encodeLocalPoint(selection.focus);
      if (
        storageAnchor === null ||
        storageFocus === null ||
        localAnchor === null ||
        localFocus === null
      ) {
        return null;
      }
      return {
        storage: { anchor: storageAnchor, focus: storageFocus },
        local: { anchor: localAnchor, focus: localFocus },
        lexical: {
          anchor: {
            key: selection.anchor.key,
            offset: selection.anchor.offset,
            type: selection.anchor.type,
          },
          focus: {
            key: selection.focus.key,
            offset: selection.focus.offset,
            type: selection.focus.type,
          },
        },
      };
    });
  }
}
