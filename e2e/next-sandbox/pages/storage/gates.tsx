import { LiveObject } from "@liveblocks/client";
import { lsonToJson } from "@liveblocks/core";
import { createRoomContext } from "@liveblocks/react";
import React from "react";

import { getRoomFromUrl, Row, styles, useRenderCount } from "../../utils";
import Button from "../../utils/Button";
import createLiveblocksClient from "../../utils/createClient";

const client = createLiveblocksClient();

const { RoomProvider, useMutation, useRoom, useSelf, useStorage } =
  createRoomContext<
    never,
    {
      object: LiveObject<{
        [key: string]: number | LiveObject<{ a: number }>;
      }>;
    }
  >(client);

export default function Home() {
  const roomId = getRoomFromUrl();
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{} as never}
      initialStorage={{
        object: new LiveObject<{
          [key: string]: number | LiveObject<{ a: number }>;
        }>(),
      }}
    >
      <Sandbox />
    </RoomProvider>
  );
}

type Internal = {
  _disableThrottle(): void;
  _testCtl(cmd: { nextOpSlow?: boolean; nextOpFail?: boolean }): Promise<void>;
};

type PrivateRoom = ReturnType<typeof useRoom> & {
  // Private APIs that aren't officially published (yet)
  __internal: Internal;
};

function Sandbox() {
  const renderCount = useRenderCount();
  const room = useRoom() as PrivateRoom;
  const obj = useStorage((root) => root.object);
  const me = useSelf();

  const setKey = useMutation(({ storage }, key: string, value: number) => {
    const obj = storage.get("object");
    obj.set(key, value);
  }, []);

  const clear = useMutation(({ storage }) => {
    const obj = storage.get("object");
    const keys = Object.keys(obj.toObject());
    let key;
    while ((key = keys.pop()) !== undefined) {
      obj.delete(key);
    }
  }, []);

  if (obj === null || me === null) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h3>
        <a href="/">Home</a> › Storage › Input/output gates
      </h3>
      <div style={{ display: "flex", margin: "8px 0" }}>
        <Button
          id="set-to-one"
          onClick={() => setKey("a", 1)}
          subtitle={`${JSON.stringify("a")} → ${JSON.stringify(1)}`}
        >
          Set to 1
        </Button>

        <Button
          id="set-to-two"
          onClick={() => setKey("a", 2)}
          subtitle={`${JSON.stringify("a")} → ${JSON.stringify(2)}`}
        >
          Set to 2
        </Button>

        <Button
          id="set-to-three"
          onClick={() => setKey("a", 3)}
          subtitle={`${JSON.stringify("a")} → ${JSON.stringify(3)}`}
        >
          Set to 3
        </Button>

        <Button
          id="slow"
          onClick={() => void room.__internal._testCtl({ nextOpSlow: true })}
          subtitle="Make next Op slow"
        >
          Slow
        </Button>

        <Button
          id="disable-throttling"
          onClick={() => room.__internal._disableThrottle()}
        >
          Disable throttling
        </Button>

        <Button id="clear" onClick={() => clear()}>
          Clear
        </Button>
      </div>

      <table style={styles.dataTable}>
        <tbody>
          <Row id="renderCount" name="Render count" value={renderCount} />
          <Row id="obj" name="Serialized" value={lsonToJson(obj)} />
        </tbody>
      </table>
    </div>
  );
}
