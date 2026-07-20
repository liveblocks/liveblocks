import {
  ChangeSet,
  EditorSelection,
  Transaction,
  type Extension,
} from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate, keymap } from "@codemirror/view";
import type { Room } from "@liveblocks/client";
import {
  kInternal,
  kStorageUpdateSource,
  type LiveText,
} from "@liveblocks/core";

import { clamp } from "./utils";

export function createLiveblocksSyncPlugin(
  room: Room,
  text: LiveText
): Extension {
  return [
    ViewPlugin.fromClass(
      class {
        private selectionByHistoryId = new Map<
          number,
          {
            before: { anchor: number; head: number; version: number };
            after: { anchor: number; head: number; version: number };
          }
        >();
        private unsubscribeFromStorageUpdates: () => void;
        private unsubscribeFromPrivateHistory: () => void;
        private groupingTimer: ReturnType<typeof setTimeout> | null = null;
        private prevLocalChanges: ChangeSet | null = null;
        private prevTime: number | null = null;
        private pendingSelectionBefore: {
          anchor: number;
          head: number;
          version: number;
        } | null = null;

        constructor(private view: EditorView) {
          this.unsubscribeFromStorageUpdates = room.subscribe(
            text,
            (updates) => {
              for (const update of updates) {
                if (update.type !== "LiveText" || update.node !== text) {
                  continue;
                }

                const source = update[kStorageUpdateSource];
                if (source?.origin === "local" && source.via === "mutation") {
                  continue;
                }

                let changes = ChangeSet.empty(view.state.doc.length);
                let currentLength = view.state.doc.length;

                for (const change of update.updates) {
                  let step: ChangeSet | null = null;
                  if (change.type === "insert") {
                    step = ChangeSet.of(
                      [{ from: change.index, insert: change.text }],
                      currentLength
                    );
                  } else if (change.type === "delete") {
                    step = ChangeSet.of(
                      [
                        {
                          from: change.index,
                          to: change.index + change.length,
                        },
                      ],
                      currentLength
                    );
                  } else if (change.type === "format") {
                    continue;
                  }

                  if (step === null) continue;
                  changes = changes.compose(step);
                  currentLength = changes.newLength;
                }

                if (changes.empty) continue;

                let selection: EditorSelection | undefined;
                if (source?.origin === "local" && source.via === "history") {
                  const id =
                    source.action === "undo"
                      ? room[kInternal].redoStack.at(-1)?.id
                      : room[kInternal].undoStack.at(-1)?.id;
                  const meta =
                    id === undefined
                      ? undefined
                      : this.selectionByHistoryId.get(id);
                  if (meta !== undefined) {
                    if (source.action === "undo") {
                      if (meta.before.anchor !== meta.before.head) {
                        selection = EditorSelection.single(
                          clamp(meta.before.anchor, {
                            min: 0,
                            max: changes.newLength,
                          }),
                          clamp(meta.before.head, {
                            min: 0,
                            max: changes.newLength,
                          })
                        );
                      } else {
                        const anchor = text[kInternal].decodeIndex(
                          meta.before.anchor,
                          meta.before.version
                        );
                        if (anchor !== null) {
                          selection = EditorSelection.single(anchor);
                        } else {
                          selection = EditorSelection.single(
                            clamp(meta.before.anchor, {
                              min: 0,
                              max: changes.newLength,
                            })
                          );
                        }
                      }
                    } else {
                      const anchor = text[kInternal].decodeIndex(
                        meta.after.anchor,
                        meta.after.version
                      );
                      const head = text[kInternal].decodeIndex(
                        meta.after.head,
                        meta.after.version
                      );
                      if (anchor !== null && head !== null) {
                        selection = EditorSelection.single(anchor, head);
                      }
                    }
                  }
                }

                this.view.dispatch({
                  changes: changes,
                  annotations: [
                    Transaction.addToHistory.of(false),
                    Transaction.remote.of(true),
                  ],
                  ...(selection !== undefined ? { selection } : {}),
                });
              }
            },
            { isDeep: true }
          );

          this.unsubscribeFromPrivateHistory = room[
            kInternal
          ].history.subscribe((event) => {
            if (event.action === "push") {
              if (this.pendingSelectionBefore !== null) {
                const afterMain = this.view.state.selection.main;
                const afterAnchor = text[kInternal].encodeIndex(
                  afterMain.anchor
                );
                this.selectionByHistoryId.set(event.id, {
                  before: this.pendingSelectionBefore,
                  after: {
                    anchor: afterAnchor,
                    head:
                      afterMain.head === afterMain.anchor
                        ? afterAnchor
                        : text[kInternal].encodeIndex(afterMain.head),
                    version: text.version,
                  },
                });
                this.pendingSelectionBefore = null;
                this.prevLocalChanges = null;
                this.prevTime = null;
              }
            } else if (event.action === "discard") {
              for (const id of event.ids) this.selectionByHistoryId.delete(id);
            } else if (event.action === "clear") {
              this.selectionByHistoryId.clear();
            }
          });
        }

        update(update: ViewUpdate) {
          if (
            update.transactions.some((tr) => tr.annotation(Transaction.remote))
          ) {
            return;
          }

          if (!update.docChanged) {
            if (update.selectionSet && this.prevLocalChanges !== null) {
              if (this.groupingTimer !== null) {
                clearTimeout(this.groupingTimer);
                this.groupingTimer = null;
              }
              room.history.resume();
            }
            return;
          }

          let userEvent: string | undefined;
          let time = Date.now();
          for (const tr of update.transactions) {
            const e = tr.annotation(Transaction.userEvent);
            if (e !== undefined) userEvent = e;
            const t = tr.annotation(Transaction.time);
            if (t !== undefined) time = t;
          }
          const isCompose = userEvent === "input.type.compose";

          if (this.prevLocalChanges !== null && !isCompose) {
            const joinable =
              userEvent === undefined || JOINABLE_USER_EVENT.test(userEvent);
            if (
              !joinable ||
              (this.prevTime !== null && time - this.prevTime >= 500) ||
              !isAdjacent(this.prevLocalChanges, update.changes)
            ) {
              if (this.groupingTimer !== null) {
                clearTimeout(this.groupingTimer);
                this.groupingTimer = null;
              }
              room.history.resume();
            }
          }

          if (this.pendingSelectionBefore === null) {
            const beforeMain = update.startState.selection.main;
            const beforeAnchor = text[kInternal].encodeIndex(beforeMain.anchor);
            this.pendingSelectionBefore = {
              anchor: beforeAnchor,
              head:
                beforeMain.head === beforeMain.anchor
                  ? beforeAnchor
                  : text[kInternal].encodeIndex(beforeMain.head),
              version: text.version,
            };
          }

          room.history.pause();
          room.batch(() => {
            let offset = 0;
            update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
              const deleteLength = toA - fromA;
              const insertText = inserted.toString();
              const index = fromA + offset;

              text.replace(index, deleteLength, insertText);

              offset += insertText.length - deleteLength;
            });
          });

          this.prevLocalChanges = this.prevLocalChanges
            ? this.prevLocalChanges.compose(update.changes)
            : update.changes;
          this.prevTime = time;

          if (this.groupingTimer !== null) {
            clearTimeout(this.groupingTimer);
          }
          this.groupingTimer = setTimeout(() => {
            room.history.resume();
            this.groupingTimer = null;
          }, 500);
        }

        destroy() {
          if (this.groupingTimer !== null) {
            clearTimeout(this.groupingTimer);
            this.groupingTimer = null;
          }
          room.history.resume();
          this.unsubscribeFromStorageUpdates();
          this.unsubscribeFromPrivateHistory();
        }
      }
    ),
    keymap.of([
      {
        key: "Mod-z",
        run: () => {
          room.history.resume();
          if (!room.history.canUndo()) return false;
          room.history.undo();
          return true;
        },
        preventDefault: true,
      },
      {
        key: "Mod-y",
        mac: "Shift-Mod-z",
        run: () => {
          room.history.resume();
          if (!room.history.canRedo()) return false;
          room.history.redo();
          return true;
        },
        preventDefault: true,
      },
    ]),
  ];
}

const JOINABLE_USER_EVENT = /^(input\.type|delete)($|\.)/;

export function isAdjacent(prev: ChangeSet, next: ChangeSet): boolean {
  const ranges: number[] = [];
  let adjacent = false;
  prev.iterChangedRanges((_f, _t, f, t) => ranges.push(f, t));
  next.iterChangedRanges((f, t) => {
    for (let i = 0; i < ranges.length; ) {
      const from = ranges[i++];
      const to = ranges[i++];
      if (t >= from && f <= to) adjacent = true;
    }
  });
  return adjacent;
}
