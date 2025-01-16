import { createRoomContext, useSyncStatus } from "@liveblocks/react";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useEffect, useMemo, useState } from "react";
import * as Y from "yjs";

import { getRoomFromUrl, Row, styles, useRenderCount } from "../../utils";
import Button from "../../utils/Button";
import { createLiveblocksClient } from "../../utils/createClient";

const client = createLiveblocksClient();

const { RoomProvider, useRoom } = createRoomContext<never, never>(client);

export default function Home() {
  const roomId = getRoomFromUrl();
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{} as never}
      initialStorage={{} as never}
    >
      <Sandbox />
    </RoomProvider>
  );
}

function Sandbox() {
  const renderCount = useRenderCount();
  const room = useRoom();
  const [text, setText] = useState<string>("");
  const smoothSyncStatus = useSyncStatus({ smooth: true });
  const [synced, setSynced] = useState(false);
  const doc = useMemo(() => new Y.Doc(), []);
  let isV2 = false;
  if (typeof window !== "undefined") {
    const q = new URL(window.location.href).searchParams;
    isV2 = q.get("useV2Encoding") === "true";
  }
  useEffect(() => {
    if (!room) {
      return;
    }
    const handler = () => {
      setText(doc.getText("test").toString());
    };
    const provider = new LiveblocksYjsProvider(room, doc, {
      useV2Encoding_experimental: isV2,
    });
    provider.on("sync", () => {
      setSynced(true);
    });
    doc.on("update", handler);
    return () => {
      setSynced(false);
      doc.off("update", handler);
      provider.destroy();
    };
  }, [doc, room, isV2]);

  const clearText = () => {
    const l = doc.getText("test").toString().length;
    if (l) {
      doc.getText("test").delete(0, l);
    }
  };

  const insertText = () => {
    doc.getText("test").insert(0, "test text");
  };

  const insertLargeString = () => {
    doc.getText("test").insert(0, "yjs ".repeat(50_000)); // insert 50k * 4 chars = 200k update
  };

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Yjs › Text
      </h3>
      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button id="insert" onClick={insertText} subtitle={"insert text"}>
          Insert Text
        </Button>
        <Button
          id="largeText"
          onClick={insertLargeString}
          subtitle={"insert large text, 200k"}
        >
          Insert Large Text (200k)
        </Button>
        <Button id="clear" onClick={clearText} subtitle={"clear"}>
          Clear
        </Button>
      </div>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
          <Row id="text" name="YDoc Text" value={text} />
          <Row id="sync" name="Synced" value={synced} />
          <Row
            id="smoothSyncStatus"
            name="Sync status (smooth)"
            value={smoothSyncStatus}
          />
        </tbody>
      </table>
    </div>
  );
}
