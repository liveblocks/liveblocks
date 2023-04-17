import { useMyPresence } from "./liveblocks.config";

export function Room() {
  const [myPresence, updateMyPresence] = useMyPresence();

  // Update cursor coordinates on pointer move
  function handlePointerMove(e) {
    const cursor = { x: e.clientX, y: e.clientY };
    updateMyPresence({ cursor });
  }

  // Set cursor to null on pointer leave
  function handlePointerLeave(e) {
    updateMyPresence({ cursor: null });
  }

  return (
    <div
      style={{ width: "100vw", height: "100vh" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {JSON.stringify(myPresence)}
    </div>
  );
}
