"use client";

import { ClientSideSuspense, RoomProvider, useRoom } from "@liveblocks/react";
import {
  createLiveblocksPresencePlugin,
  createLiveblocksSyncPlugin,
} from "@liveblocks/codemirror";
import {
  use,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { EditorState } from "@codemirror/state";
import { Room } from "@liveblocks/client";
import { LiveText } from "@liveblocks/core";
import { EditorView } from "@codemirror/view";

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
      <ClientSideSuspense fallback={<div>Connecting to room…</div>}>
        <div className="h-dvh">
          <Editor />
        </div>
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function Editor() {
  const room = useRoom();
  const root = useRoot(room);
  if (root == null) {
    return <div>Loading room data…</div>;
  }

  return <EditorInner text={root.get("document")} />;
}

function EditorInner({ text }: { text: LiveText }) {
  const room = useRoom();
  const container = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);

  useEffect(() => {
    if (container.current === null) return;

    const _view = new EditorView({
      parent: container.current,
      state: EditorState.create({
        doc: text.toString(),
        extensions: [
          createLiveblocksSyncPlugin(room, text),
          createLiveblocksPresencePlugin(room, text),
        ],
      }),
    });

    view.current = _view;
    return () => {
      _view.destroy();
      view.current = null;
    };
  }, []);

  return (
    <div className="relative min-h-0">
      <div ref={container} className="h-full [&_.cm-editor]:h-full" />
    </div>
  );
}

function useRoot(room: Room) {
  const subscribe = room.events.storageDidLoad.subscribeOnce;
  const getSnapshot = room.getStorageOrNull;
  const getServerSnapshot = useCallback(() => {
    return null;
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
