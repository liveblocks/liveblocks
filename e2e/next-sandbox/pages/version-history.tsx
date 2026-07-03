import type { LsonObject } from "@liveblocks/client";
import { LiveList, LiveObject } from "@liveblocks/client";
import { kInternal } from "@liveblocks/core";
import { createRoomContext } from "@liveblocks/react";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";

import { getRoomFromUrl, getUserFromUrl, randomInt } from "../utils";
import Button from "../utils/Button";
import { createLiveblocksClient } from "../utils/createClient";

const client = createLiveblocksClient({
  // Attribute edits to the ?user= in the URL, so version authors differ per tab.
  authEndpoint: async (_roomId) => {
    const userId = getUserFromUrl();
    const resp = await fetch(
      `/api/auth/access-token?user=${encodeURIComponent(userId)}`
    );
    return resp.json();
  },
});

// The Storage root _is_ the document (no wrapper field), so the live document
// and a reconstructed historic version render the exact same shape.
const {
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useDeleteHistoryVersion,
  useHistoryVersionStorageData,
  useHistoryVersionYjsData,
  useHistoryVersions,
  useMutation,
  useRedo,
  useRestoreToStorageVersion,
  useRoom,
  useSelf,
  useStorage,
  useUndo,
} = createRoomContext<never, LsonObject>(client);

// A small, fixed key pool so repeated edits overwrite existing keys -- letting
// you flip a key between a number, a nested object, and a list to produce
// interesting version-to-version diffs.
const KEYS = ["a", "b", "c", "d", "e"];
const randomKey = () => KEYS[randomInt(KEYS.length)];

// Decodes a Yjs version's update bytes into the plain text of its "text" field.
function yjsUpdateToText(update: Uint8Array | undefined): string {
  if (update === undefined) {
    return "";
  }
  const doc = new Y.Doc();
  Y.applyUpdate(doc, update);
  return doc.getText("text").toString();
}

export default function Home() {
  const roomId = getRoomFromUrl();
  return (
    <RoomProvider id={roomId} initialPresence={{} as never} initialStorage={{}}>
      <Sandbox />
    </RoomProvider>
  );
}

function Sandbox() {
  const doc = useStorage((root) => root);
  const me = useSelf();
  const room = useRoom();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const { versions, error: versionsError } = useHistoryVersions();
  const deleteHistoryVersion = useDeleteHistoryVersion();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  // A Yjs document living on the same room, so a version snapshot captures both
  // the Storage and the Yjs surfaces (the cross-facet part of the feature).
  const ydoc = useMemo(() => new Y.Doc(), []);
  const [yjsText, setYjsText] = useState("");
  const [yjsInput, setYjsInput] = useState("");
  const [yjsCanUndo, setYjsCanUndo] = useState(false);
  const [yjsCanRedo, setYjsCanRedo] = useState(false);
  const yjsUndoManager = useRef<Y.UndoManager | null>(null);

  useEffect(() => {
    const provider = new LiveblocksYjsProvider(room, ydoc);
    const ytext = ydoc.getText("text");
    // Yjs has its own history (separate from the room's Storage undo/redo). It
    // tracks only local edits, not the remote changes the provider applies.
    const undoManager = new Y.UndoManager(ytext);
    yjsUndoManager.current = undoManager;
    const handler = () => {
      const text = ytext.toString();
      setYjsText(text);
      setYjsInput(text); // keep the editable box in sync with the document
      setYjsCanUndo(undoManager.undoStack.length > 0);
      setYjsCanRedo(undoManager.redoStack.length > 0);
    };
    ydoc.on("update", handler);
    handler();
    return () => {
      ydoc.off("update", handler);
      undoManager.destroy();
      yjsUndoManager.current = null;
      provider.destroy();
    };
  }, [room, ydoc]);

  const setNumber = useMutation(({ storage }) => {
    storage.set(randomKey(), randomInt(100));
  }, []);

  const addObject = useMutation(({ storage }) => {
    storage.set(randomKey(), new LiveObject({ n: randomInt(100) }));
  }, []);

  const addList = useMutation(({ storage }) => {
    storage.set(randomKey(), new LiveList([randomInt(100), randomInt(100)]));
  }, []);

  // Deeply nested edit: push a value into the first list found in the document.
  const pushToList = useMutation(({ storage }, value: number) => {
    for (const key of storage.keys()) {
      const child = storage.get(key);
      if (child instanceof LiveList) {
        child.push(value);
        return;
      }
    }
  }, []);

  const deleteKey = useMutation(({ storage }, key: string) => {
    storage.delete(key);
  }, []);

  const clearStorage = useMutation(({ storage }) => {
    for (const key of [...storage.keys()]) {
      storage.delete(key);
    }
  }, []);

  const setYjs = () => {
    const text = ydoc.getText("text");
    text.delete(0, text.length);
    text.insert(0, yjsInput);
  };

  const clearYjs = () => {
    const text = ydoc.getText("text");
    text.delete(0, text.length);
  };

  const createSnapshot = () => {
    void room[kInternal].createVersionHistorySnapshot();
  };

  // Restore Yjs: replace the live text with the historic version's text.
  const restoreYjs = (text: string) => {
    const live = ydoc.getText("text");
    live.delete(0, live.length);
    live.insert(0, text);
  };

  if (doc === null || me === null) {
    return <div>Loading…</div>;
  }

  const keys = Object.keys(doc);
  const hasList = Object.values(doc).some((v) => Array.isArray(v));
  const keyToDelete = keys.length > 0 ? keys[randomInt(keys.length)] : "";

  return (
    <div>
      {toast ? (
        <div
          id="toast"
          onClick={() => setToast(null)}
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            background: "#b00020",
            color: "white",
            padding: "10px 14px",
            borderRadius: 6,
            maxWidth: 360,
            cursor: "pointer",
            zIndex: 1000,
          }}
        >
          {toast}
        </div>
      ) : null}
      <h3>
        <a href="/">Home</a> › Version history
      </h3>

      <p>
        You are <strong id="me">{me.id ?? "(anonymous)"}</strong>. Open this
        page in several tabs with different <code>?user=</code> values, edit
        from each, then snapshot to see multiple authors on a version. A
        snapshot captures both the Storage and Yjs surfaces.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", margin: "8px 0" }}>
        <Button id="create-version" onClick={createSnapshot}>
          📸 Create version snapshot
        </Button>
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <section style={{ flex: 1 }}>
          <h4>Live document</h4>

          <h5>Storage</h5>
          <div style={{ display: "flex", flexWrap: "wrap", margin: "4px 0" }}>
            <Button id="set-number" onClick={() => setNumber()}>
              Set number
            </Button>
            <Button id="add-object" onClick={() => addObject()}>
              Add nested object
            </Button>
            <Button id="add-list" onClick={() => addList()}>
              Add list
            </Button>
            <Button
              id="push-to-list"
              enabled={hasList}
              onClick={() => pushToList(randomInt(100))}
            >
              Push to a list
            </Button>
            <Button
              id="delete"
              enabled={keys.length > 0}
              onClick={() => deleteKey(keyToDelete)}
              subtitle={keyToDelete ? `key ${keyToDelete}` : null}
            >
              Delete key
            </Button>
            <Button
              id="clear-storage"
              enabled={keys.length > 0}
              onClick={() => clearStorage()}
            >
              Clear
            </Button>
            <Button id="undo" enabled={canUndo} onClick={undo}>
              Undo
            </Button>
            <Button id="redo" enabled={canRedo} onClick={redo}>
              Redo
            </Button>
          </div>
          <pre id="live-doc" style={preStyle}>
            {JSON.stringify(doc, null, 2)}
          </pre>

          <h5>Yjs</h5>
          <div style={{ display: "flex", gap: 8, margin: "4px 0" }}>
            <textarea
              id="yjs-input"
              value={yjsInput}
              onChange={(e) => setYjsInput(e.target.value)}
              placeholder="Yjs document text"
              rows={3}
              style={{ padding: 4, resize: "vertical", minWidth: 200 }}
            />
            <Button id="set-yjs" onClick={setYjs}>
              Set Yjs text
            </Button>
            <Button
              id="clear-yjs"
              enabled={yjsText.length > 0}
              onClick={clearYjs}
            >
              Clear
            </Button>
            <Button
              id="undo-yjs"
              enabled={yjsCanUndo}
              onClick={() => yjsUndoManager.current?.undo()}
            >
              Undo
            </Button>
            <Button
              id="redo-yjs"
              enabled={yjsCanRedo}
              onClick={() => yjsUndoManager.current?.redo()}
            >
              Redo
            </Button>
          </div>
          <pre id="live-yjs" style={yjsPreStyle}>
            {yjsText || "(empty)"}
          </pre>
        </section>

        <section style={{ flex: 1 }}>
          <h4>Versions ({versions?.length ?? 0})</h4>
          {versionsError ? (
            <div style={{ color: "red" }}>{versionsError.message}</div>
          ) : null}
          <ul id="versions" style={{ paddingLeft: 16 }}>
            {versions?.map((v) => (
              <li key={v.id} style={{ marginBottom: 4 }}>
                <button
                  id={`version-${v.id}`}
                  onClick={() => setSelectedVersionId(v.id)}
                  style={{
                    fontWeight: v.id === selectedVersionId ? "bold" : "normal",
                  }}
                >
                  <code>{v.id}</code>
                </button>{" "}
                <small>
                  {v.createdAt.toLocaleTimeString()} · authors:{" "}
                  <span className="authors">
                    {v.authors.map((a) => a.id).join(", ") || "(none)"}
                  </span>
                </small>{" "}
                <button
                  id={`delete-version-${v.id}`}
                  onClick={() => {
                    deleteHistoryVersion(v.id).catch((err: unknown) =>
                      showToast(
                        err instanceof Error ? err.message : String(err)
                      )
                    );
                    if (v.id === selectedVersionId) {
                      setSelectedVersionId(null);
                    }
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section style={{ flex: 1 }}>
          <h4>Selected version</h4>
          {selectedVersionId ? (
            <VersionView
              key={selectedVersionId}
              versionId={selectedVersionId}
              onRestoreYjs={restoreYjs}
              onError={showToast}
            />
          ) : (
            <div>Select a version to see its document.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function VersionView({
  versionId,
  onRestoreYjs,
  onError,
}: {
  versionId: string;
  onRestoreYjs: (text: string) => void;
  onError: (message: string) => void;
}) {
  const storage = useHistoryVersionStorageData(versionId);
  const yjs = useHistoryVersionYjsData(versionId);
  const yjsText = useMemo(() => yjsUpdateToText(yjs.data), [yjs.data]);
  const restoreStorage = useRestoreToStorageVersion(versionId);

  return (
    <>
      <h5>Storage</h5>
      <pre id="version-doc" style={preStyle}>
        {storage.isLoading
          ? "Loading…"
          : storage.error
            ? storage.error.message
            : // `data` is a read-only LiveObject; toJSON() gives the full
              // historic document, same shape as the live document on the left.
              storage.data
              ? JSON.stringify(storage.data.toJSON(), null, 2)
              : "(empty document)"}
      </pre>
      <Button
        id="restore-storage"
        onClick={() =>
          void restoreStorage().catch((err: unknown) =>
            onError(err instanceof Error ? err.message : String(err))
          )
        }
      >
        Restore Storage
      </Button>

      <h5>Yjs</h5>
      <pre id="version-yjs" style={yjsPreStyle}>
        {yjs.isLoading
          ? "Loading…"
          : yjs.error
            ? yjs.error.message
            : yjsText || "(empty)"}
      </pre>
      <Button
        id="restore-yjs"
        enabled={!yjs.isLoading && !yjs.error}
        onClick={() => onRestoreYjs(yjsText)}
      >
        Restore Yjs
      </Button>
    </>
  );
}

const preStyle = {
  background: "#f5f5f5",
  padding: 8,
  borderRadius: 4,
  overflow: "auto",
} as const;

// Yjs text is prose, so wrap it instead of scrolling horizontally.
const yjsPreStyle = {
  ...preStyle,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
} as const;
