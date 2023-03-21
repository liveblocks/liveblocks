import React from "react";
import { RoomProvider } from "../liveblocks.config";

function Example() {
  return <h1>Welcome to Liveblocks</h1>;
}

export default function Page() {
  const roomId = "{% ROOM_ID %}";

  return (
    <RoomProvider
      id={roomId}
      /**
       * Initialize the cursor position to null when joining the room
       */
      initialPresence={{
        cursor: null,
      }}
    >
      <Example />
    </RoomProvider>
  );
}
