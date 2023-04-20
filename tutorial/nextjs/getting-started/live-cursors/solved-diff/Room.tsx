import { useMyPresence, useOthers } from "./liveblocks.config";
import { Cursor } from "./Cursor";

export function Room() {
  const [myPresence, updateMyPresence] = useMyPresence();

  // Get list of other users
  const others = useOthers();

  function handlePointerMove(e) {
    const cursor = { x: e.clientX, y: e.clientY };
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
      {others
        .filter((other) => other.presence?.cursor)
        .map(({ presence }) => (
          <Cursor x={presence.cursor.x} y={presence.cursor.y} />
        ))}
    </div>
  );
}
