import { useMyPresence } from "./liveblocks.config";

export function Room() {
  const [myPresence, updateMyPresence] = useMyPresence();

  return <div>Cursor: {displayValue(myPresence.cursor)}</div>;
}
