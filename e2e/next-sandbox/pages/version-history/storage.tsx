import type { LsonObject } from "@liveblocks/client";
import { LiveList, LiveObject } from "@liveblocks/client";
import { kInternal } from "@liveblocks/core";
import { createRoomContext } from "@liveblocks/react";
import { useState } from "react";

import { getRoomFromUrl, getUserFromUrl, randomInt } from "../../utils";
import Button from "../../utils/Button";
import { createLiveblocksClient } from "../../utils/createClient";

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
  useHistoryVersionStorageData,
  useHistoryVersions,
  useMutation,
  useRoom,
  useSelf,
  useStorage,
} = createRoomContext<never, LsonObject>(client);

// A small, fixed key pool so repeated edits overwrite existing keys -- letting
// you flip a key between a number, a nested object, and a list to produce
// interesting version-to-version diffs.
const KEYS = ["a", "b", "c", "d", "e"];
const randomKey = () => KEYS[randomInt(KEYS.length)];

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
  const { versions, error: versionsError } = useHistoryVersions();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );

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

  const clear = useMutation(({ storage }) => {
    for (const key of [...storage.keys()]) {
      storage.delete(key);
    }
  }, []);

  const createSnapshot = () => {
    void room[kInternal].createVersionHistorySnapshot();
  };

  if (doc === null || me === null) {
    return <div>Loading…</div>;
  }

  const keys = Object.keys(doc);
  const hasList = Object.values(doc).some((v) => Array.isArray(v));
  const keyToDelete = keys.length > 0 ? keys[randomInt(keys.length)] : "";

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Version history › Storage
      </h3>

      <p>
        You are <strong id="me">{me.id ?? "(anonymous)"}</strong>. Open this page
        in several tabs with different <code>?user=</code> values, edit from
        each, then snapshot to see multiple authors on a version.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", margin: "8px 0" }}>
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
        <Button id="clear" enabled={keys.length > 0} onClick={() => clear()}>
          Clear
        </Button>
        <Button id="create-version" onClick={createSnapshot}>
          📸 Create version snapshot
        </Button>
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <section style={{ flex: 1 }}>
          <h4>Live document</h4>
          <pre id="live-doc" style={preStyle}>
            {JSON.stringify(doc, null, 2)}
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
                  {v.createdAt.toLocaleTimeString()}
                </button>{" "}
                <small>
                  authors:{" "}
                  <span className="authors">
                    {v.authors.map((a) => a.id).join(", ") || "(none)"}
                  </span>
                </small>
              </li>
            ))}
          </ul>
        </section>

        <section style={{ flex: 1 }}>
          <h4>Selected version</h4>
          {selectedVersionId ? (
            <VersionStorage
              key={selectedVersionId}
              versionId={selectedVersionId}
            />
          ) : (
            <div>Select a version to see its document.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function VersionStorage({ versionId }: { versionId: string }) {
  const { data, isLoading, error } = useHistoryVersionStorageData(versionId);
  if (isLoading) {
    return <div>Loading version…</div>;
  }
  if (error) {
    return <div style={{ color: "red" }}>{error.message}</div>;
  }
  if (!data) {
    return <div>(empty document)</div>;
  }
  // `data` is a read-only LiveObject reconstructed from the snapshot. toJSON()
  // returns the complete historic document as plain JSON -- the same shape the
  // live document renders on the left.
  return (
    <pre id="version-doc" style={preStyle}>
      {JSON.stringify(data.toJSON(), null, 2)}
    </pre>
  );
}

const preStyle = {
  background: "#f5f5f5",
  padding: 8,
  borderRadius: 4,
  overflow: "auto",
} as const;
