import React from "react";
import { RoomProvider } from "../liveblocks.config";

export default function App () {
  if (!RoomProvider) {
    return <div>Not connected</div>
  }

  return <div>Connected to Liveblocks!</div>
}

/*
function Example() {
  return <h1>Welcome</h1>;
}

export default function Page() {
  const roomId = "{% ROOM_ID %}";

  return (
    <RoomProvider
      id={roomId}
      /**
       * Initialize the cursor position to null when joining the room

      initialPresence={{
        cursor: null,
      }}
    >
      <Example />
    </RoomProvider>
  );
}
  */
