import type { Room } from "@liveblocks/client";
// LiveText is experimental: encoding caret positions for presence relies on
// internal APIs that are not part of the stable public surface yet.
import { kInternal, type LiveText } from "@liveblocks/core";
import type { EditorChangeEvent } from "@pierre/diffs";
import type { Editor } from "@pierre/diffs/edit";

import { offsetToPosition, positionToOffset } from "./text-positions";

/** Another user's carets/selections, as offsets into the current local document. */
export type RemoteSelection = {
  connectionId: number;
  name?: string;
  color?: string;
  ranges: { anchor: number; head: number }[];
};

export type LiveTextBinding = {
  /** Forward the editor's `onChange` events here. */
  handleEditorChange: (event: EditorChangeEvent<undefined>) => void;
  destroy: () => void;
};

type LiveTextBindingOptions = {
  room: Room;
  /** The shared document backing this editor. */
  text: LiveText;
  /** The `@pierre/diffs` editor attached to the rendered file surface. */
  editor: Editor<undefined>;
  /** Path of the file being edited. Carets only sync between users on the same file. */
  path: string;
  /** Element wrapping the editable surface, used to intercept undo/redo shortcuts. */
  container: HTMLElement;
  /** Called whenever other users' carets (may) have moved. */
  onRemoteSelections: (selections: RemoteSelection[]) => void;
};

/** Consecutive edits within this window collapse into a single undo entry. */
const HISTORY_GROUPING_DELAY = 500;

/**
 * Two-way binds a `@pierre/diffs` edit-mode `Editor` to a Liveblocks
 * `LiveText` document, and syncs carets/selections through presence.
 *
 * - Local edits are replayed into the LiveText as `replace()` calls.
 * - Remote (and undo/redo-replayed) LiveText updates are applied to the
 *   editor with `applyEdits()`.
 * - Cmd/Ctrl+Z is routed to the room's collaborative history, so undo only
 *   reverts this user's own edits (LiveText rebases the replayed operations
 *   over everyone else's concurrent edits).
 * - The local selection is encoded with the LiveText's version vector and
 *   published as presence; other users' selections are decoded back into
 *   current local document offsets.
 */
export function bindEditorToLiveText({
  room,
  text,
  editor,
  path,
  container,
  onRemoteSelections,
}: LiveTextBindingOptions): LiveTextBinding {
  /** True while remote/replayed LiveText changes are applied to the editor. */
  let applyingRemote = false;
  let groupingTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPublishedSelection: string | null = null;

  /**
   * Replaces the editor contents with the LiveText contents when they differ
   * (e.g. remote edits that landed between rendering the initial snapshot and
   * attaching this binding).
   */
  function reconcileEditorWithText(): void {
    const expected = text.toString();
    const actual = editor.getText();
    if (actual === expected) {
      return;
    }
    applyingRemote = true;
    try {
      editor.applyEdits(
        [
          {
            range: {
              start: { line: 0, character: 0 },
              end: offsetToPosition(actual, actual.length),
            },
            newText: expected,
          },
        ],
        false
      );
    } finally {
      applyingRemote = false;
    }
  }

  function resumeHistoryNow(): void {
    if (groupingTimer !== null) {
      clearTimeout(groupingTimer);
      groupingTimer = null;
    }
    room.history.resume();
  }

  // ---- Local edits → LiveText -------------------------------------------

  function handleEditorChange(event: EditorChangeEvent<undefined>): void {
    if (applyingRemote) {
      // This change originated from LiveText; don't echo it back.
      return;
    }

    // Group rapid keystrokes into a single collaborative undo entry.
    if (groupingTimer !== null) {
      clearTimeout(groupingTimer);
    }
    room.history.pause();
    groupingTimer = setTimeout(() => {
      groupingTimer = null;
      room.history.resume();
    }, HISTORY_GROUPING_DELAY);

    room.batch(() => {
      // All changes in the event are expressed against the pre-edit document,
      // in document order; track the running length delta while replaying.
      let delta = 0;
      for (const change of event.changes) {
        text.replace(
          change.start + delta,
          change.end - change.start,
          change.text
        );
        delta += change.text.length - (change.end - change.start);
      }
    });

    publishSelection();
    recomputeRemoteSelections();
  }

  // ---- Remote and undo/redo-replayed LiveText updates → editor -----------

  const unsubscribeFromStorage = room.subscribe(
    text,
    (updates) => {
      for (const update of updates) {
        if (update.type !== "LiveText" || update.node !== text) {
          continue;
        }
        if (update.source.origin === "local" && update.source.via === "edit") {
          // Already applied by the editor itself.
          continue;
        }

        applyingRemote = true;
        try {
          for (const change of update.updates) {
            // Change indices refer to the document state after the previous
            // change in this batch, so re-read the text for each one.
            const docText = editor.getText();
            if (change.type === "insert") {
              const position = offsetToPosition(docText, change.index);
              editor.applyEdits(
                [{ range: { start: position, end: position }, newText: change.text }],
                false
              );
            } else if (change.type === "delete") {
              editor.applyEdits(
                [
                  {
                    range: {
                      start: offsetToPosition(docText, change.index),
                      end: offsetToPosition(docText, change.index + change.length),
                    },
                    newText: "",
                  },
                ],
                false
              );
            }
            // "format" changes don't apply to plain source code.
          }
        } finally {
          applyingRemote = false;
        }
      }

      // The document advanced: selections that couldn't be decoded before may
      // be decodable now, and everyone's offsets may have shifted.
      recomputeRemoteSelections();
      publishSelection();
    },
    { isDeep: true }
  );

  // ---- Own carets → presence ---------------------------------------------

  function publishSelection(): void {
    const selections = editor.getState().selections ?? [];
    const docText = editor.getText();
    const ranges = selections.map((selection) => {
      const startOffset = positionToOffset(docText, selection.start);
      const endOffset = positionToOffset(docText, selection.end);
      const [anchor, head] =
        selection.direction === -1
          ? [endOffset, startOffset]
          : [startOffset, endOffset];
      // Encode offsets into server-confirmed coordinates (paired with the
      // version below) so receivers can rebase them onto their own document.
      return {
        anchor: text[kInternal].encodeIndex(anchor),
        head: text[kInternal].encodeIndex(head),
      };
    });

    const selection =
      ranges.length === 0
        ? null
        : { file: path, version: text.version, ranges };
    const serialized = JSON.stringify(selection);
    if (serialized === lastPublishedSelection) {
      return;
    }
    lastPublishedSelection = serialized;
    room.updatePresence({ selection });
  }

  function handleSelectionChange(): void {
    publishSelection();
  }

  // Fires whenever the caret moves inside the editable surface (the editor
  // tracks selections through the native Selection API).
  document.addEventListener("selectionchange", handleSelectionChange);

  // ---- Others' carets → onRemoteSelections --------------------------------

  function recomputeRemoteSelections(): void {
    const result: RemoteSelection[] = [];
    for (const user of room.getOthers()) {
      const selection = user.presence.selection;
      if (selection === null || selection === undefined || selection.file !== path) {
        continue;
      }

      const ranges: { anchor: number; head: number }[] = [];
      for (const range of selection.ranges) {
        // Decode `(offset, version)` pairs into offsets in our own current
        // document. Returns null when we haven't caught up to the sender's
        // version yet; the storage subscription retries after every update.
        const anchor = text[kInternal].decodeIndex(range.anchor, selection.version);
        const head = text[kInternal].decodeIndex(range.head, selection.version);
        if (anchor === null || head === null) {
          continue;
        }
        ranges.push({ anchor, head });
      }
      if (ranges.length === 0) {
        continue;
      }

      result.push({
        connectionId: user.connectionId,
        name: user.info?.name,
        color: user.info?.color,
        ranges,
      });
    }
    onRemoteSelections(result);
  }

  const unsubscribeFromOthers = room.subscribe("others", () => {
    recomputeRemoteSelections();
  });

  // ---- Collaborative undo/redo -------------------------------------------

  function handleKeyDown(event: KeyboardEvent): void {
    if ((!event.metaKey && !event.ctrlKey) || event.altKey) {
      return;
    }
    const key = event.key.toLowerCase();
    const isUndo = key === "z" && !event.shiftKey;
    const isRedo = (key === "z" && event.shiftKey) || (key === "y" && !event.shiftKey);
    if (!isUndo && !isRedo) {
      return;
    }

    // Replace the editor's single-user history with the room's collaborative
    // history: it only replays this user's own edits, rebased over everyone
    // else's concurrent changes.
    event.preventDefault();
    event.stopPropagation();
    resumeHistoryNow();
    if (isUndo) {
      room.history.undo();
    } else {
      room.history.redo();
    }
  }

  // Capture phase, so the editor's built-in undo/redo bindings never fire.
  container.addEventListener("keydown", handleKeyDown, true);

  // ---- Initial sync --------------------------------------------------------

  reconcileEditorWithText();
  recomputeRemoteSelections();
  publishSelection();

  return {
    handleEditorChange,
    destroy() {
      resumeHistoryNow();
      container.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("selectionchange", handleSelectionChange);
      unsubscribeFromStorage();
      unsubscribeFromOthers();
      room.updatePresence({ selection: null });
    },
  };
}
