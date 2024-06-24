import { useStorage, useMutation } from "@liveblocks/react/suspense";

export function Room() {
  const person = useStorage((root) => root.person);

  // Add mutation

  return <div>Person: {JSON.stringify(person)}</div>;
}
