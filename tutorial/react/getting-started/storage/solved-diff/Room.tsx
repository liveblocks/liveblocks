import { useStorage } from "@liveblocks/react/suspense";

export function Room() {
  const person = useStorage((root) => root.person);

  return <div>Person: {JSON.stringify(person)}</div>;
}
