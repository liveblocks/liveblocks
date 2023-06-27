import { useStorage } from "./liveblocks.config";

export function Room() {
  const person = useStorage((root) => root.person);

  return <div>Person: {JSON.stringify(person)}</div>;
}
