import { createRoomContext } from "@liveblocks/react";
import LiveblocksProvider from "@liveblocks/yjs";
import React, { useEffect, useMemo, useState } from "react";
import * as Y from "yjs";

import {
  getRoomFromUrl,
  Row,
  styles,
  useRenderCount,
} from "../../utils";
import Button from "../../utils/Button";
import createLiveblocksClient from "../../utils/createClient";

const client = createLiveblocksClient();

const {
  RoomProvider,
  useRoom,
} = createRoomContext<never, never>(client);




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
  const doc = useMemo(() => new Y.Doc(), []);
  useEffect(() => {
    if (!room) {
      return;
    }
    const handler = () => { setText(doc.getText("test").toString()) };
    const provider = new LiveblocksProvider(room, doc);
    doc.on("update", handler);
    return () => {
      doc.off("update", handler)
      provider.destroy();
    }
  }, [doc, room])


  return (
    <div>
      <h3>
        <a href="/">Home</a> › Storage › LiveMap
      </h3>
      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button
          id="set"
          onClick={() => { doc.getText("test").insert(0, "test text") }}
          subtitle={"set text"}
        >
          Set
        </Button>
        <Button
          id="clear"
          onClick={() => { doc.getText("test").delete(0, doc.getText("test").toString().length) }}
          subtitle={"clear"}
        >
          clear
        </Button>

      </div>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
          <Row id="text" name="YDoc Text" value={text} />
        </tbody>
      </table>
    </div>
  );
}
