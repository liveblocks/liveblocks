import { useStorage, useMutation } from "@liveblocks/react/suspense";

export function Room() {
  const person = useStorage((root) => root.person);

  // Add mutation
  const updateName = useMutation(({ storage }, newName: string) => {
    const person = storage.get("person");
    person.set("name", newName);
  }, []);

  return (
    <input
      type="text"
      value={person.name}
      onChange={(e) => updateName(e.target.value)}
    />
  );
}
