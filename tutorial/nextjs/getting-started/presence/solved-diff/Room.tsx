import { useMyPresence } from "./liveblocks.config";

export function Room() {
  const [myPresence, updateMyPresence] = useMyPresence();

  return <div>Cursor: {JSON.stringify(myPresence.cursor)}</div>;
}
