import { createRoomContext, useSyncStatus } from "@liveblocks/react";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [subdocContent, setSubdocContent] = useState<Record<string, string>>(
    {}
  );
  const syncStatus = useSyncStatus({ smooth: true });
  const [synced, setSynced] = useState(false);
  const [provider, setProvider] =
    useState<LiveblocksYjsProvider>();
  const doc = useMemo(() => new Y.Doc(), []);

  const updateSubdocContent = useCallback(() => {
    const docContent: Record<string, string> = {};
    for (const subdoc of doc.getSubdocs()) {
      const guid = subdoc.guid;
      docContent[guid] = subdoc.getText("test").toString();
    }
    setSubdocContent(docContent);
  }, [doc]);

  useEffect(() => {
    if (!room) {
      return;
    }
    const provider = new LiveblocksYjsProvider(room, doc, {
      autoloadSubdocs: false,
    });
    doc.on("subdocs", updateSubdocContent);
    setProvider(provider);
    provider.on("sync", () => {
      setSynced(true);
    });
    return () => {
      setSynced(false);
      doc.off("subdocs", updateSubdocContent);
      provider.destroy();
    };
  }, [doc, room, updateSubdocContent]);

  const clear = () => {
    for (const subdoc of doc.getSubdocs()) {
      const guid = subdoc.guid;
      if (doc.getMap().has(guid)) {
        doc.getMap().delete(guid);
      }
      subdoc.destroy();
    }
    setSubdocContent({});
  };

  const createSubdoc = () => {
    const newDoc = new Y.Doc();
    doc.getMap().set(newDoc.guid, newDoc);
    newDoc.getText("test").insert(0, "test subdoc text");
    updateSubdocContent();
  };

  const loadSubdocs = useCallback(() => {
    for (const subdoc of doc.getSubdocs()) {
      subdoc.load();
      const guid = subdoc.guid;
      const handler = provider?.subdocHandlers.get(guid);
      handler?.once("synced", updateSubdocContent);
    }
  }, [updateSubdocContent, provider, doc]);

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Yjs › Subdocs
      </h3>
      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button id="insert" onClick={createSubdoc} subtitle={"insert text"}>
          Create Subdoc with Text
        </Button>
        <Button id="load" onClick={loadSubdocs} subtitle={"load subdocs"}>
          Load Subdoc with Text
        </Button>
        <Button id="clear" onClick={clear} subtitle={"clear"}>
          Clear
        </Button>
      </div>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
          <Row
            id="text"
            name="Subdoc Content"
            value={JSON.stringify(subdocContent)}
          />
          <Row id="sync" name="Root Doc Synced" value={synced} />
          <Row id="syncStatus" name="Sync status" value={syncStatus} />
        </tbody>
      </table>
    </div>
  );
}
