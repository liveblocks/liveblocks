import { useMyPresence, useOthers } from "@liveblocks/react/suspense";
import { Cursor } from "./Cursor";

export function Room() {
  const [myPresence, updateMyPresence] = useMyPresence();

  // Get list of other users

  function handlePointerMove(e) {
    const cursor = { x: Math.floor(e.clientX), y: Math.floor(e.clientY) };
    updateMyPresence({ cursor });
  }

  function handlePointerLeave(e) {
    updateMyPresence({ cursor: null });
  }

  return (
    <div
      style={{ width: "100vw", height: "100vh" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      Cursor: {JSON.stringify(myPresence.cursor)}
    </div>
  );
}
