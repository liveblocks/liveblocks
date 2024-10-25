import { createRoomContext } from "@liveblocks/react";
import LiveblocksProvider from "@liveblocks/yjs";
import { nanoid } from "@reduxjs/toolkit";
import React, { useEffect, useMemo, useState } from "react";
import { YKeyValue } from 'y-utility/y-keyvalue'
import * as Y from "yjs";

import { getRoomFromUrl, Row, styles, useRenderCount } from "../../utils";
import Button from "../../utils/Button";
import createLiveblocksClient from "../../utils/createClient";

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
  const [synced, setSynced] = useState(false);
  const doc = useMemo(() => new Y.Doc(), []);
  useEffect(() => {
    if (!room) {
      return;
    }
    const handler = () => {
      setText(`Size of the encoded document: ${Y.encodeStateAsUpdate(doc).length}\nSize of V2 encoded document: ${Y.encodeStateAsUpdateV2(doc).length}`);
    };
    const provider = new LiveblocksProvider(room, doc);
    provider.on("sync", () => {
      setSynced(true);
    });
    doc.on("update", handler);
    return () => {
      setSynced(false);
      doc.off("update", handler);
      provider.destroy();
    };
  }, [doc, room]);

  const clearText = () => {
    for (const key of doc.getMap("test").keys()) {
      doc.getMap("test").delete(key);
    }
    const yarr = doc.getArray("testkvr");
    yarr.delete(0, yarr.length);
  };

  const insertYMap = () => {
    for (let i = 0; i < 1000; i++) {
      const key = nanoid();
      doc.getMap("test").set(key, "lorem ipsum sed dolerat I forget the rest");
    }
  };

  const insertYKeyvalue = () => {
    const yarr: Y.Array<{ key: string; val: unknown; }> = doc.getArray("testkvr")
    const ykv = new YKeyValue(yarr)
    for (let i = 0; i < 1000; i++) {
      const key = nanoid();
      ykv.set(key, "lorem ipsum sed dolerat I forget the rest");
    }
  };

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Yjs › YMap
      </h3>
      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button id="insert" onClick={insertYMap} subtitle={"insert text"}>
          Insert 1000 YMap Elements
        </Button>
        <Button id="insert" onClick={insertYKeyvalue} subtitle={"insert text"}>
          Insert 1000 YKeyValue Elements
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
        </tbody>
      </table>
    </div>
  );
}
