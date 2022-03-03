import { useOthers } from "@liveblocks/react";

export default function WhosHere() {
  const numberOfUsersInTheRoom = useOthers().count;

  if (numberOfUsersInTheRoom === 0) {
    return <div>You’re the only one here.</div>;
  } else if (numberOfUsersInTheRoom === 1) {
    return <div>There is one other person here.</div>;
  } else {
    return <div>There are {numberOfUsersInTheRoom} other people here</div>;
  }
}
