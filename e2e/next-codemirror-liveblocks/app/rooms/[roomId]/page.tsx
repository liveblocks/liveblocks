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
  Direction,
  EditorView,
  highlightActiveLineGutter,
  keymap,
  layer,
  LayerMarker,
  lineNumbers,
  RectangleMarker,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import {
  ChangeSet,
  Compartment,
  EditorSelection,
  StateEffect,
  StateField,
  Transaction,
} from "@codemirror/state";
import { LiveObject, Room } from "@liveblocks/client";
import { kInternal, kStorageUpdateSource, LiveText } from "@liveblocks/core";

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
        <div className="h-dvh">
          <Editor roomId={roomId} />
        </div>
      </ClientSideSuspense>
    </RoomProvider>
  );
}

const DEFAULT_EXTENSIONS = [
  javascript(),
  lineNumbers({
    formatNumber: (lineNo) => String(lineNo).padStart(3, " "),
  }),
  highlightActiveLineGutter(),
  EditorView.theme({
    ".cm-lineNumbers .cm-gutterElement": {
      minWidth: "3.5ch",
      fontVariantNumeric: "tabular-nums",
    },
  }),
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
        compartment.of([
          createLiveblocksSyncPlugin(room, root),
          createLiveblocksPresencePlugin(room, root),
        ])
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
      className="h-full [&_.cm-editor]:h-full"
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
      private groupingTimer: ReturnType<typeof setTimeout> | null = null;
      private prevLocalChanges: ChangeSet | null = null;
      private prevTime: number | null = null;
      private pendingSelectionBefore: {
        anchor: number;
        head: number;
        version: number;
      } | null = null;

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
            if (event.action === "push") {
              if (this.pendingSelectionBefore !== null) {
                const text = root.get("document");
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
          }
        );
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

        const text = root.get("document");

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
            text.replace(fromA + offset, deleteLength, insertText);
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
  );
}

export function createLiveblocksPresencePlugin(
  room: Room,
  root: LiveObject<{ document: LiveText }>
) {
  type RemoteSelection = {
    connectionId: number;
    anchor: number;
    head: number;
    name?: string;
    color?: string;
  };

  const upsertRemoteSelections = StateEffect.define<Array<RemoteSelection>>();
  const removeRemoteSelections = StateEffect.define<Set<number>>();

  const remoteSelectionsState = StateField.define<Array<RemoteSelection>>({
    create(state) {
      const document = root.get("document");
      const selections: RemoteSelection[] = [];

      for (const user of room.getOthers()) {
        const presenceSelection = user.presence.selection;
        if (presenceSelection == null) continue;

        const anchor = document[kInternal].decodeIndex(
          presenceSelection.anchor,
          presenceSelection.version
        );
        const head = document[kInternal].decodeIndex(
          presenceSelection.head,
          presenceSelection.version
        );
        if (head === null || anchor === null) continue;

        selections.push({
          connectionId: user.connectionId,
          anchor: clamp(anchor, { min: 0, max: state.doc.length }),
          head: clamp(head, { min: 0, max: state.doc.length }),
          name: user.info?.name,
          color: user.info?.color,
        });
      }

      return selections;
    },
    update(selections, tr) {
      let nextSelections = selections;

      if (tr.docChanged) {
        nextSelections = nextSelections.map((selection) => ({
          ...selection,
          anchor: clamp(tr.changes.mapPos(selection.anchor, 1), {
            min: 0,
            max: tr.newDoc.length,
          }),
          head: clamp(tr.changes.mapPos(selection.head, 1), {
            min: 0,
            max: tr.newDoc.length,
          }),
        }));
      }

      for (const effect of tr.effects) {
        if (effect.is(upsertRemoteSelections)) {
          nextSelections = [
            ...new Map(
              [...nextSelections, ...effect.value].map((sel) => [
                sel.connectionId,
                {
                  ...sel,
                  anchor: clamp(sel.anchor, {
                    min: 0,
                    max: tr.newDoc.length,
                  }),
                  head: clamp(sel.head, { min: 0, max: tr.newDoc.length }),
                },
              ])
            ).values(),
          ];
        } else if (effect.is(removeRemoteSelections)) {
          nextSelections = nextSelections.filter(
            (selection) => !effect.value.has(selection.connectionId)
          );
        }
      }

      return nextSelections;
    },
  });

  class RemoteSelectionMarker implements LayerMarker {
    constructor(
      readonly left: number,
      readonly top: number,
      readonly width: number,
      readonly height: number,
      readonly color: string
    ) {}

    eq(other: LayerMarker): boolean {
      return (
        other instanceof RemoteSelectionMarker &&
        other.left === this.left &&
        other.top === this.top &&
        other.width === this.width &&
        other.height === this.height &&
        other.color === this.color
      );
    }

    draw(): HTMLElement {
      const element = document.createElement("div");
      element.className = "lb-remote-selection";
      element.style.setProperty("--lb-remote-color", this.color);
      element.style.left = `${this.left}px`;
      element.style.top = `${this.top}px`;
      element.style.width = `${this.width}px`;
      element.style.height = `${this.height}px`;
      return element;
    }

    update(element: HTMLElement, prev: LayerMarker): boolean {
      if (!(prev instanceof RemoteSelectionMarker)) return false;
      if (prev.color !== this.color) return false;
      element.style.left = `${this.left}px`;
      element.style.top = `${this.top}px`;
      element.style.width = `${this.width}px`;
      element.style.height = `${this.height}px`;
      return true;
    }
  }

  class RemoteCaretMarker implements LayerMarker {
    constructor(
      readonly left: number,
      readonly top: number,
      readonly height: number,
      readonly selection: RemoteSelection
    ) {}

    eq(other: LayerMarker): boolean {
      return (
        other instanceof RemoteCaretMarker &&
        other.selection.connectionId === this.selection.connectionId &&
        other.left === this.left &&
        other.top === this.top &&
        other.height === this.height &&
        other.selection.color === this.selection.color
      );
    }

    draw(): HTMLElement {
      const element = document.createElement("div");
      element.className = "lb-remote-caret";
      element.style.setProperty(
        "--lb-remote-color",
        this.selection.color ?? "#888888"
      );
      element.style.left = `${this.left}px`;
      element.style.top = `${this.top}px`;
      element.style.height = `${this.height}px`;
      element.setAttribute("aria-hidden", "true");

      return element;
    }

    update(element: HTMLElement, prev: LayerMarker): boolean {
      if (!(prev instanceof RemoteCaretMarker)) return false;
      if (prev.selection.connectionId !== this.selection.connectionId)
        return false;
      element.style.setProperty(
        "--lb-remote-color",
        this.selection.color ?? "#888888"
      );
      element.style.left = `${this.left}px`;
      element.style.top = `${this.top}px`;
      element.style.height = `${this.height}px`;
      return true;
    }
  }

  function createRemoteSelectionMarkers(view: EditorView): LayerMarker[] {
    const selections = view.state.field(remoteSelectionsState);
    const markers: LayerMarker[] = [];

    for (const selection of selections) {
      const from = clamp(Math.min(selection.anchor, selection.head), {
        min: 0,
        max: view.state.doc.length,
      });
      const to = clamp(Math.max(selection.anchor, selection.head), {
        min: 0,
        max: view.state.doc.length,
      });
      if (from === to) continue;

      const color = selection.color ?? "#888888";
      for (const rect of RectangleMarker.forRange(
        view,
        "lb-remote-selection",
        EditorSelection.range(from, to)
      )) {
        if (rect.width === null) continue;
        markers.push(
          new RemoteSelectionMarker(
            rect.left,
            rect.top,
            rect.width,
            rect.height,
            color
          )
        );
      }
    }

    return markers;
  }

  function createRemoteCaretMarkers(view: EditorView): LayerMarker[] {
    const selections = view.state.field(remoteSelectionsState);
    const markers: LayerMarker[] = [];
    const scrollRect = view.scrollDOM.getBoundingClientRect();
    const originLeft =
      (view.textDirection === Direction.LTR
        ? scrollRect.left
        : scrollRect.right - view.scrollDOM.clientWidth * view.scaleX) -
      view.scrollDOM.scrollLeft * view.scaleX;
    const originTop = scrollRect.top - view.scrollDOM.scrollTop * view.scaleY;

    for (const selection of selections) {
      const head = clamp(selection.head, {
        min: 0,
        max: view.state.doc.length,
      });
      const coords = view.coordsAtPos(head, head <= selection.anchor ? -1 : 1);
      if (coords === null) continue;

      markers.push(
        new RemoteCaretMarker(
          coords.left - originLeft,
          coords.top - originTop,
          coords.bottom - coords.top,
          selection
        )
      );
    }

    return markers;
  }

  const shouldRedrawRemotePresence = (update: ViewUpdate) =>
    update.docChanged ||
    update.viewportChanged ||
    update.geometryChanged ||
    update.transactions.some((tr) =>
      tr.effects.some(
        (effect) =>
          effect.is(upsertRemoteSelections) || effect.is(removeRemoteSelections)
      )
    );

  return [
    remoteSelectionsState,
    layer({
      above: false,
      class: "lb-remote-selectionLayer",
      markers: createRemoteSelectionMarkers,
      update: shouldRedrawRemotePresence,
    }),
    layer({
      above: true,
      class: "lb-remote-caretLayer",
      markers: createRemoteCaretMarkers,
      update: shouldRedrawRemotePresence,
    }),
    ViewPlugin.fromClass(
      class {
        private pendingSelectionsByConnectionId = new Map<
          number,
          {
            anchor: number;
            head: number;
            version: number;
            name?: string;
            color?: string;
          }
        >();
        private unsubscribeFromPresenceUpdates: () => void;
        private unsubscribeFromStorageUpdates: () => void;

        constructor(private view: EditorView) {
          this.unsubscribeFromStorageUpdates = room.subscribe(
            root,
            () => {
              if (this.pendingSelectionsByConnectionId.size === 0) {
                return;
              }
              const document = root.get("document");
              const rebasedSelection: Array<RemoteSelection> = [];
              for (const [
                connectionId,
                selection,
              ] of this.pendingSelectionsByConnectionId.entries()) {
                const anchor = document[kInternal].decodeIndex(
                  selection.anchor,
                  selection.version
                );
                const head = document[kInternal].decodeIndex(
                  selection.head,
                  selection.version
                );
                if (anchor === null || head === null) continue;

                this.pendingSelectionsByConnectionId.delete(connectionId);
                rebasedSelection.push({
                  connectionId,
                  anchor,
                  head,
                  name: selection.name,
                  color: selection.color,
                });
              }
              if (rebasedSelection.length > 0) {
                this.view.dispatch({
                  effects: upsertRemoteSelections.of(rebasedSelection),
                });
              }
            },
            { isDeep: true }
          );

          this.unsubscribeFromPresenceUpdates = room.subscribe(
            "others",
            (others) => {
              const rebasedSelection: Array<RemoteSelection> = [];
              const connections = new Set<number>();
              const connectionIdsToRemove = new Set<number>();

              const document = root.get("document");

              for (const user of others) {
                connections.add(user.connectionId);
                if (user.presence.selection === null) {
                  this.pendingSelectionsByConnectionId.delete(
                    user.connectionId
                  );
                  connectionIdsToRemove.add(user.connectionId);
                  continue;
                }

                const anchor = document[kInternal].decodeIndex(
                  user.presence.selection.anchor,
                  user.presence.selection.version
                );
                const head = document[kInternal].decodeIndex(
                  user.presence.selection.head,
                  user.presence.selection.version
                );
                if (head === null || anchor === null) {
                  this.pendingSelectionsByConnectionId.set(user.connectionId, {
                    anchor: user.presence.selection.anchor,
                    head: user.presence.selection.head,
                    version: user.presence.selection.version,
                    name: user.info?.name,
                    color: user.info?.color,
                  });
                  continue;
                }

                this.pendingSelectionsByConnectionId.delete(user.connectionId);
                rebasedSelection.push({
                  connectionId: user.connectionId,
                  anchor,
                  head,
                  name: user.info?.name,
                  color: user.info?.color,
                });
              }

              for (const selection of this.view.state.field(
                remoteSelectionsState
              )) {
                if (!connections.has(selection.connectionId)) {
                  connectionIdsToRemove.add(selection.connectionId);
                }
              }
              for (const connectionId of this.pendingSelectionsByConnectionId.keys()) {
                if (!connections.has(connectionId)) {
                  this.pendingSelectionsByConnectionId.delete(connectionId);
                  connectionIdsToRemove.add(connectionId);
                }
              }

              const effects: Array<
                StateEffect<
                  | Array<{
                      connectionId: number;
                      anchor: number;
                      head: number;
                    }>
                  | Set<number>
                >
              > = [];

              if (rebasedSelection.length > 0) {
                effects.push(upsertRemoteSelections.of(rebasedSelection));
              }
              if (connectionIdsToRemove.size > 0) {
                effects.push(removeRemoteSelections.of(connectionIdsToRemove));
              }
              if (effects.length > 0) {
                this.view.dispatch({ effects });
              }
            }
          );
        }

        update(update: ViewUpdate) {
          if (!update.selectionSet && !update.docChanged) return;
          if (
            update.transactions.some((tr) => tr.annotation(Transaction.remote))
          ) {
            return;
          }
          const document = root.get("document");
          const selection = this.view.state.selection.main;
          const encodedAnchor = document[kInternal].encodeIndex(
            selection.anchor
          );
          const encodedHead =
            selection.head === selection.anchor
              ? encodedAnchor
              : document[kInternal].encodeIndex(selection.head);
          room.updatePresence({
            selection: {
              anchor: encodedAnchor,
              head: encodedHead,
              version: document.version,
            },
          });
        }

        destroy() {
          this.unsubscribeFromPresenceUpdates();
          this.unsubscribeFromStorageUpdates();
          room.updatePresence({ selection: null });
        }
      }
    ),
  ];
}

function clamp(
  value: number,
  { min, max }: { min: number; max: number }
): number {
  return Math.max(min, Math.min(value, max));
}

const JOINABLE_USER_EVENT = /^(input\.type|delete)($|\.)/;

function isAdjacent(prev: ChangeSet, next: ChangeSet): boolean {
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
