import { useMyPresence } from "@liveblocks/react/suspense";

export function Room() {
  const [myPresence, updateMyPresence] = useMyPresence();

  return <div>Cursor: {JSON.stringify(myPresence.cursor)}</div>;
}
