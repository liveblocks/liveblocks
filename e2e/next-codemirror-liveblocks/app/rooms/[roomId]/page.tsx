"use client";

import { ClientSideSuspense, RoomProvider, useRoom } from "@liveblocks/react";
import {
  use,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { CodeMirror, CodemirrorElement } from "./codemirror";
import { javascript } from "@codemirror/lang-javascript";
import {
  EditorView,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import {
  ChangeSet,
  Compartment,
  EditorSelection,
  StateEffect,
  Transaction,
} from "@codemirror/state";
import { LiveObject, LiveText, Room } from "@liveblocks/client";
import { kInternal, kStorageUpdateSource } from "@liveblocks/core";

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ selection: null }}
      initialStorage={{ document: new LiveText("Hello, world") }}
    >
      <ClientSideSuspense fallback={null}>
        <Editor roomId={roomId} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

const DEFAULT_EXTENSIONS = [
  javascript(),
  lineNumbers(),
  highlightActiveLineGutter(),
];

function Editor({ roomId }: { roomId: string }) {
  const room = useRoom();
  const root = useRoot(room);
  const editor = useRef<CodemirrorElement>(null);

  useEffect(() => {
    if (editor.current === null) return;
    if (root == null) return;

    const view = editor.current.getView();
    if (view === null) return;

    const document = root.get("document").toString();
    if (view.state.doc.toString() !== document) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: document },
        annotations: [Transaction.remote.of(true)],
        selection: EditorSelection.single(
          Math.min(view.state.selection.main.head, document.length)
        ),
      });
    }

    const compartment = new Compartment();

    view.dispatch({
      effects: StateEffect.appendConfig.of(
        compartment.of([createLiveblocksSyncPlugin(room, root)])
      ),
    });

    return () => {
      view.dispatch({
        effects: compartment.reconfigure([]),
      });
    };
  }, [editor, room, root]);

  useEffect(() => {
    if (editor.current === null) return;

    const view = editor.current.getView();
    if (view === null) return;

    const compartment = new Compartment();

    view.dispatch({
      effects: StateEffect.appendConfig.of(
        compartment.of(
          keymap.of([
            {
              key: "Mod-z",
              run: () => {
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
                if (!room.history.canRedo()) return false;
                room.history.redo();
                return true;
              },
              preventDefault: true,
            },
          ])
        )
      ),
    });

    return () => {
      view.dispatch({
        effects: compartment.reconfigure([]),
      });
    };
  }, [editor, room]);

  return (
    <CodeMirror
      ref={editor}
      defaultExtensions={DEFAULT_EXTENSIONS}
      className="[&>.cm-editor]:h-full"
    />
  );
}

function useRoot(room: Room) {
  const subscribe = room.events.storageDidLoad.subscribeOnce;
  const getSnapshot = room.getStorageSnapshot;
  const getServerSnapshot = useCallback(() => {
    return null;
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function createLiveblocksSyncPlugin(
  room: Room,
  root: LiveObject<{ document: LiveText }>
) {
  return ViewPlugin.fromClass(
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

      constructor(private view: EditorView) {
        const document = root.get("document");
        this.unsubscribeFromStorageUpdates = room.subscribe(
          root,
          (updates) => {
            for (const update of updates) {
              if (update.type !== "LiveText" || update.node !== document) {
                continue;
              }

              const source = update[kStorageUpdateSource];
              if (source?.origin === "local" && source.via === "mutation") {
                continue;
              }

              let changes = ChangeSet.empty(view.state.doc.length);
              let currentLength = view.state.doc.length;

              for (const change of update.updates) {
                let step: ChangeSet;
                if (change.type === "insert") {
                  step = ChangeSet.of(
                    [{ from: change.index, insert: change.text }],
                    currentLength
                  );
                } else if (change.type === "delete") {
                  step = ChangeSet.of(
                    [{ from: change.index, to: change.index + change.length }],
                    currentLength
                  );
                } else {
                  continue;
                }

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
                      const anchor = document[kInternal].decodeIndex(
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
                    const anchor = document[kInternal].decodeIndex(
                      meta.after.anchor,
                      meta.after.version
                    );
                    const head = document[kInternal].decodeIndex(
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

        this.unsubscribeFromPrivateHistory = room[kInternal].history.subscribe(
          (event) => {
            if (event.action === "discard") {
              for (const id of event.ids) this.selectionByHistoryId.delete(id);
            } else if (event.action === "clear") {
              this.selectionByHistoryId.clear();
            }
          }
        );
      }

      update(update: ViewUpdate) {
        if (!update.docChanged) return;
        if (
          update.transactions.some((tr) => tr.annotation(Transaction.remote))
        ) {
          return;
        }

        const text = root.get("document");
        const beforeMain = update.startState.selection.main;
        const beforeAnchor = text[kInternal].encodeIndex(beforeMain.anchor);
        const beforeHead =
          beforeMain.head === beforeMain.anchor
            ? beforeAnchor
            : text[kInternal].encodeIndex(beforeMain.head);
        const beforeVersion = text.version;

        room.batch(() => {
          // Tracks cumulative length delta from operations already applied to liveText.
          let offset = 0;
          update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
            const deleteLength = toA - fromA;
            const insertText = inserted.toString();
            text.replace(fromA + offset, deleteLength, insertText);
            offset += insertText.length - deleteLength;
          });
        });

        const id = room[kInternal].undoStack.at(-1)?.id;
        if (id !== undefined) {
          const afterMain = update.state.selection.main;
          const afterAnchor = text[kInternal].encodeIndex(afterMain.anchor);
          const afterHead =
            afterMain.head === afterMain.anchor
              ? afterAnchor
              : text[kInternal].encodeIndex(afterMain.head);
          this.selectionByHistoryId.set(id, {
            before: {
              anchor: beforeAnchor,
              head: beforeHead,
              version: beforeVersion,
            },
            after: {
              anchor: afterAnchor,
              head: afterHead,
              version: text.version,
            },
          });
        }
      }

      destroy() {
        this.unsubscribeFromStorageUpdates();
        this.unsubscribeFromPrivateHistory();
      }
    }
  );
}

function clamp(
  value: number,
  { min, max }: { min: number; max: number }
): number {
  return Math.max(min, Math.min(value, max));
}
