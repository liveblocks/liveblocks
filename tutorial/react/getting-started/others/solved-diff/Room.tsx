import { useOthers } from "@liveblocks/react/suspense";

export function Room() {
  // Add useOthers
  const others = useOthers();
  const userCount = others.length;

  return <div>There are {userCount} other user(s) online</div>;
}
