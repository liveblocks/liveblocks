import { useStorage, useMutation } from "./liveblocks.config";

export function Room() {
  const person = useStorage((root) => root.person);

  // Add mutation

  return <div>Person: {JSON.stringify(person)}</div>;
}
