import type { Room } from "@liveblocks/client";
import { mergeRegister } from "@lexical/utils";
import {
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CLEAR_EDITOR_COMMAND,
  CLEAR_HISTORY_COMMAND,
  COLLABORATION_TAG,
  COMMAND_PRIORITY_EDITOR,
  HISTORIC_TAG,
  HISTORY_MERGE_TAG,
  HISTORY_PUSH_TAG,
  type LexicalEditor,
  PASTE_TAG,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical";

/**
 * Idle window for merging local edits into one `room.history` stack item.
 * Matches `@lexical/react` `useHistory` so Lexical users get familiar undo
 * granularity; CodeMirror uses 500ms for the same Storage mechanism.
 */
const HISTORY_CAPTURE_TIMEOUT_MS = 1000;

/**
 * Storage-backed undo/redo for Lexical.
 *
 * ## First principles
 *
 * The undoable artifact is Storage ops (`room.history`), not Lexical
 * EditorState snapshots. Lexical node keys are local and diverge across
 * peers; CRDT reverse ops re-project everywhere.
 *
 * Grouping therefore cannot copy `@lexical/history`'s change-type classifier
 * (insert-char-after-selection, etc.). That classifier exists to decide
 * whether two *EditorState* snapshots should share a stack slot. Here the
 * stack slot is a pause/resume buffer of Storage frames — any local dirty
 * edit inside the idle window belongs in the same item, the same way Yjs
 * UndoManager groups by time.
 *
 * ## Capture model
 *
 * - `pause()`  — subsequent Storage mutations accumulate in one stack item
 * - `resume()` — commit that item onto the undo stack
 *
 * This module must run its update listener *before* Lexical → Storage sync
 * so `pause()` is active when mutations land. Undo/redo discard
 * `pausedHistory`, so we always `resume()` before those commands.
 *
 * ## Boundaries
 *
 * | Signal                          | Action                                   |
 * |---------------------------------|------------------------------------------|
 * | dirty + capture already open    | extend (`pause` + reset idle timer)      |
 * | dirty + no open capture         | open a new capture                       |
 * | `HISTORY_PUSH_TAG` / `PASTE_TAG` | hard boundary (commit, then new capture) |
 * | `HISTORY_MERGE_TAG`             | force extend even across idle            |
 * | selection-only / empty          | ignore (no Storage mutation)             |
 * | `HISTORIC_TAG` / collab          | ignore (not a local authoring edit)      |
 * | idle timer fires                | `resume()`                               |
 *
 * Selection-only updates do **not** close the capture. They add no Storage
 * frames, and Lexical emits them often; closing would split typing bursts
 * that still belong in one undo item. Idle time is the soft boundary.
 */
export function registerLiveblocksHistory(
  editor: LexicalEditor,
  room: Room
): () => void {
  let captureTimer: ReturnType<typeof setTimeout> | null = null;
  /** True while we have called `pause()` and not yet committed via `resume()`. */
  let isCapturing = false;

  function dispatchCanUndoRedoCommands() {
    editor.dispatchCommand(CAN_UNDO_COMMAND, room.history.canUndo());
    editor.dispatchCommand(CAN_REDO_COMMAND, room.history.canRedo());
  }

  const clearCaptureTimer = () => {
    if (captureTimer === null) {
      return;
    }
    clearTimeout(captureTimer);
    captureTimer = null;
  };

  /**
   * Commit the open pause group onto the undo stack. Safe when history was
   * never paused (`resume` is a no-op on an empty paused buffer).
   */
  const commitCapture = () => {
    clearCaptureTimer();
    if (!isCapturing) {
      return;
    }
    isCapturing = false;
    room.history.resume();
  };

  const scheduleCommit = () => {
    clearCaptureTimer();
    captureTimer = setTimeout(() => {
      captureTimer = null;
      isCapturing = false;
      room.history.resume();
      dispatchCanUndoRedoCommands();
    }, HISTORY_CAPTURE_TIMEOUT_MS);
  };

  /** Open or extend a paused history group and arm the idle commit timer. */
  const beginOrExtendCapture = () => {
    isCapturing = true;
    room.history.pause();
    scheduleCommit();
  };

  dispatchCanUndoRedoCommands();

  return mergeRegister(
    editor.registerUpdateListener(({ dirtyLeaves, dirtyElements, tags }) => {
      // Peer / undo projections are not authoring — leave capture alone.
      if (tags.has(HISTORIC_TAG) || tags.has(COLLABORATION_TAG)) {
        return;
      }

      const hasDirtyNodes = dirtyLeaves.size > 0 || dirtyElements.size > 0;

      // Selection-only: no Storage mutation will follow. Leave any open
      // capture alone so a brief caret move does not split a typing burst;
      // the idle timer still commits.
      if (!hasDirtyNodes) {
        return;
      }

      // Explicit merge: stay in the current item even across idle.
      if (tags.has(HISTORY_MERGE_TAG)) {
        beginOrExtendCapture();
        return;
      }

      // Hard boundaries: paste and explicit push always start a new item.
      const hardBoundary = tags.has(HISTORY_PUSH_TAG) || tags.has(PASTE_TAG);

      if (hardBoundary || !isCapturing) {
        // `hardBoundary` while capturing: commit the previous item first.
        // `!capturing`: commitCapture is a no-op; we still open below.
        commitCapture();
      }

      beginOrExtendCapture();
    }),
    editor.registerCommand(
      UNDO_COMMAND,
      () => {
        // Flush first — undo discards `pausedHistory`.
        commitCapture();
        if (!room.history.canUndo()) {
          return false;
        }
        room.history.undo();
        dispatchCanUndoRedoCommands();
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      REDO_COMMAND,
      () => {
        commitCapture();
        if (!room.history.canRedo()) {
          return false;
        }
        room.history.redo();
        dispatchCanUndoRedoCommands();
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      CLEAR_HISTORY_COMMAND,
      () => {
        commitCapture();
        room.history.clear();
        dispatchCanUndoRedoCommands();
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    editor.registerCommand(
      CLEAR_EDITOR_COMMAND,
      () => {
        commitCapture();
        room.history.clear();
        dispatchCanUndoRedoCommands();
        return false;
      },
      COMMAND_PRIORITY_EDITOR
    ),
    room.subscribe("history", dispatchCanUndoRedoCommands),
    () => {
      commitCapture();
    }
  );
}
