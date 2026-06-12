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
import { LiveObject, LiveText, Room, StorageUpdate } from "@liveblocks/client";
import { kStorageUpdateSource, StorageUpdateSource } from "@liveblocks/core";

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
        compartment.of(createLiveblocksSyncPlugin(room, root))
      ),
    });

    return () => {
      view.dispatch({
        effects: compartment.reconfigure([]),
      });
    };
  }, [editor, room, root]);

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

function createLiveblocksSyncPlugin(
  room: Room,
  root: LiveObject<{ document: LiveText }>
) {
  return ViewPlugin.fromClass(
    class {
      private unsubscribeFromStorageUpdates: () => void;

      constructor(private view: EditorView) {
        const document = root.get("document");
        this.unsubscribeFromStorageUpdates = room.subscribe(
          root,
          (updates) => {
            for (const update of updates) {
              if (update.type !== "LiveText" || update.node !== document) {
                continue;
              }

              const source = (
                update as StorageUpdate & {
                  readonly [kStorageUpdateSource]?: StorageUpdateSource;
                }
              )[kStorageUpdateSource];
              if (source === "local") continue;

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

              this.view.dispatch({
                changes: changes,
                annotations: [
                  Transaction.addToHistory.of(false),
                  Transaction.remote.of(true),
                ],
              });
            }
          },
          { isDeep: true }
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
      }

      destroy() {
        this.unsubscribeFromStorageUpdates();
      }
    }
  );
}
