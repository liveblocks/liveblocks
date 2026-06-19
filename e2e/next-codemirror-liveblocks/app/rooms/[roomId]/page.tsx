"use client";

import {
  ClientSideSuspense,
  RoomProvider,
  useRoom,
  useThreads,
} from "@liveblocks/react";
import { Thread } from "@liveblocks/react-ui";
import {
  createLiveblocksPresencePlugin,
  createLiveblocksSyncPlugin,
} from "@liveblocks/codemirror";
import {
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { CodeMirror, CodemirrorElement } from "./codemirror";
import {
  closePendingComment,
  createLiveblocksCommentFormatPreservationPlugin,
  createLiveblocksCommentsPlugin,
  getCommentPluginState,
  getThreadPositions,
  openPendingComment,
  removeDeletedCommentThreadFormatting,
  selectThread,
  setVisibleCommentThreads,
} from "./comments-plugin";
import { CodeMirrorFloatingComposer } from "./FloatingComposer";
import { javascript } from "@codemirror/lang-javascript";
import {
  EditorView,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { Compartment, EditorSelection, StateEffect, Transaction } from "@codemirror/state";
import { LiveObject, Room } from "@liveblocks/client";
import { LiveText } from "@liveblocks/core";

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
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [isComposerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    if (editor.current === null) return;
    if (root == null) return;

    const view = editor.current.getView();
    if (view === null) return;
    setEditorView(view);

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
          createLiveblocksCommentFormatPreservationPlugin(room, root),
          createLiveblocksSyncPlugin(room, root),
          ...createLiveblocksCommentsPlugin(room, root),
          ...createLiveblocksPresencePlugin(room, root),
        ])
      ),
    });

    return () => {
      view.dispatch({
        effects: compartment.reconfigure([]),
      });
      setEditorView(null);
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

  const handleOpenComposer = useCallback(() => {
    if (editorView === null) return;
    if (openPendingComment(editorView)) {
      setComposerOpen(true);
    }
  }, [editorView]);

  const handleCloseComposer = useCallback(() => {
    if (editorView !== null) {
      closePendingComment(editorView);
    }
    setComposerOpen(false);
  }, [editorView]);

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_360px]">
      <div className="relative min-h-0">
        <div className="lb-cm-toolbar">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleOpenComposer}
          >
            Comment
          </button>
        </div>
        <CodeMirror
          ref={editor}
          defaultExtensions={DEFAULT_EXTENSIONS}
          className="h-full [&_.cm-editor]:h-full"
        />
        {isComposerOpen && editorView !== null && root !== null ? (
          <CodeMirrorFloatingComposer
            view={editorView}
            root={root}
            onClose={handleCloseComposer}
          />
        ) : null}
      </div>
      {editorView !== null && root !== null ? (
        <CodeMirrorCommentsSidebar view={editorView} room={room} root={root} />
      ) : null}
    </div>
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

function CodeMirrorCommentsSidebar({
  view,
  room,
  root,
}: {
  view: EditorView;
  room: Room;
  root: LiveObject<{ document: LiveText }>;
}) {
  const threadsResult = useThreads();
  const [positions, setPositions] = useState(() => getThreadPositions(root));
  const [activeThreadIds, setActiveThreadIds] = useState<string[]>([]);

  useEffect(() => {
    const updatePositions = () => {
      setPositions(new Map(getThreadPositions(root)));
    };

    updatePositions();
    return room.subscribe(root, updatePositions, { isDeep: true });
  }, [room, root]);

  useEffect(() => {
    const compartment = new Compartment();

    view.dispatch({
      effects: StateEffect.appendConfig.of(
        compartment.of(
          EditorView.updateListener.of(() => {
            setActiveThreadIds(
              getCommentPluginState(view)?.activeThreadIds ?? []
            );
          })
        )
      ),
    });

    return () => {
      view.dispatch({ effects: compartment.reconfigure([]) });
    };
  }, [view]);

  const threads =
    "threads" in threadsResult && threadsResult.threads !== undefined
      ? threadsResult.threads
      : [];
  const visibleThreadIds = useMemo(
    () =>
      new Set(
        threads
          .filter((thread) => !thread.resolved)
          .map((thread) => thread.id)
      ),
    [threads]
  );
  const existingThreadIds = useMemo(
    () => new Set(threads.map((thread) => thread.id)),
    [threads]
  );

  useEffect(() => {
    if (!("threads" in threadsResult)) return;

    room.batch(() => {
      removeDeletedCommentThreadFormatting(root, existingThreadIds);
    });
  }, [existingThreadIds, room, root, threadsResult]);

  useEffect(() => {
    if (!("threads" in threadsResult)) return;

    setVisibleCommentThreads(view, visibleThreadIds);
    return () => {
      setVisibleCommentThreads(view, null);
    };
  }, [threadsResult, view, visibleThreadIds]);

  const anchoredThreads = useMemo(
    () =>
      threads.filter(
        (thread) => !thread.resolved && positions.has(thread.id)
      ),
    [positions, threads]
  );

  return (
    <aside className="lb-cm-comments-sidebar">
      <h2>Comments</h2>
      {threadsResult.isLoading ? (
        <p className="lb-cm-comments-empty">Loading comments...</p>
      ) : anchoredThreads.length === 0 ? (
        <p className="lb-cm-comments-empty">
          Select code and click Comment to start a thread.
        </p>
      ) : (
        <div className="lb-cm-thread-list">
          {anchoredThreads.map((thread) => {
            const position = positions.get(thread.id);
            const isActive = activeThreadIds.includes(thread.id);

            return (
              <div
                key={thread.id}
                role="button"
                tabIndex={0}
                className="lb-cm-thread-button"
                data-active={isActive ? "" : undefined}
                onClick={() => {
                  selectThread(view, thread.id);
                  if (position !== undefined) {
                    view.dispatch({
                      selection: EditorSelection.single(
                        position.from,
                        position.to
                      ),
                    });
                  }
                  view.focus();
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  selectThread(view, thread.id);
                  if (position !== undefined) {
                    view.dispatch({
                      selection: EditorSelection.single(
                        position.from,
                        position.to
                      ),
                    });
                  }
                  view.focus();
                }}
              >
                <Thread thread={thread} showResolveAction />
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
