import { useStorage, useMutation } from "./liveblocks.config";

export function Room() {
  const person = useStorage((root) => root.person);

  // Add mutation
  const updateName = useMutation(({ storage }, name: string) => {
    storage.get("person").set("name", name);
  }, []);

  return (
    <div>
      <input
        id="name"
        type="text"
        value={person.name}
        onChange={(e) => updateName(e.target.value)}
      />
    </div>
  );
}
