"use client";

import {
  useCanRedo,
  useCanUndo,
  useOthers,
  useRoom,
  useSelf,
} from "@liveblocks/react/suspense";
import { Redo2, Undo2 } from "lucide-react";
import { useCallback, useState, useSyncExternalStore } from "react";
import { DEFAULT_ACTIVE_FILE } from "@/app/project";
import { CollaborativeEditor } from "@/components/editor/collaborative-editor";
import { FileTreePanel } from "@/components/file-tree-panel";
import { HelpButton } from "@/components/help-button";

export function CodeWorkspace() {
  const root = useStorageRoot();
  const [activePath, setActivePath] = useState<string>(DEFAULT_ACTIVE_FILE);

  if (root === null) {
    return null;
  }

  const files = root.get("files");
  const paths = [...files.keys()].sort();
  const text = files.get(activePath);

  return (
    <div className="flex h-dvh flex-col bg-neutral-50 text-neutral-900">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4">
        <div className="ml-auto flex items-center gap-3">
          <Avatars />
          <HelpButton />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-60 shrink-0 overflow-hidden border-r border-neutral-200 bg-white">
          <FileTreePanel
            paths={paths}
            activePath={activePath}
            onSelectFile={setActivePath}
          />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <FileHeader path={activePath} />
          <div className="min-h-0 flex-1">
            {text !== undefined ? (
              <CollaborativeEditor
                key={activePath}
                path={activePath}
                text={text}
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * The current room's Storage root as live nodes (rather than the immutable
 * snapshots that `useStorage` returns), so the editor can bind directly to
 * the LiveText documents.
 */
function useStorageRoot() {
  const room = useRoom();
  const subscribe = room.events.storageDidLoad.subscribeOnce;
  const getServerSnapshot = useCallback(() => null, []);
  return useSyncExternalStore(
    subscribe,
    room.getStorageOrNull,
    getServerSnapshot
  );
}

/** Tab-like bar showing the open file and who else is editing it. */
function FileHeader({ path }: { path: string }) {
  const others = useOthers();
  const editingHere = others.filter(
    (other) => other.presence.selection?.file === path
  );

  return (
    <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-neutral-200 bg-white px-4">
      <span className="font-mono text-xs text-neutral-600">{path}</span>
      <div className="flex items-center gap-1">
        {editingHere.map((other) => (
          <span
            key={other.connectionId}
            title={`${other.info.name} is editing this file`}
            className="size-2 rounded-full"
            style={{ backgroundColor: other.info.color }}
          />
        ))}
      </div>
      <HistoryControls />
    </div>
  );
}

/** Undo/redo buttons backed by the room's collaborative history. */
function HistoryControls() {
  const room = useRoom();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={() => {
          room.history.resume();
          room.history.undo();
        }}
        className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
      >
        <Undo2 className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={() => {
          room.history.resume();
          room.history.redo();
        }}
        className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
      >
        <Redo2 className="size-4" />
      </button>
    </div>
  );
}

/** Everyone currently in the room. */
function Avatars() {
  const others = useOthers();
  const self = useSelf();

  return (
    <div className="flex items-center">
      {others.map((other) => (
        <img
          key={other.connectionId}
          src={other.info.avatar}
          alt={other.info.name}
          title={other.info.name}
          className="-ml-2 size-7 rounded-full first:ml-0"
          style={{ boxShadow: `0 0 0 2px ${other.info.color}` }}
          draggable={false}
        />
      ))}
      <img
        src={self.info.avatar}
        alt={`${self.info.name} (you)`}
        title={`${self.info.name} (you)`}
        className="-ml-2 size-7 rounded-full first:ml-0"
        style={{ boxShadow: `0 0 0 2px ${self.info.color}` }}
        draggable={false}
      />
    </div>
  );
}
