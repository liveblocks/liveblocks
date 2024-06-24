import { LiveObject } from "@liveblocks/client";
import { useStorage, useMutation } from "@liveblocks/react/suspense";

export function Room() {
  const people = useStorage((root) => root.people);

  // Update name mutation
  const updateName = useMutation(
    ({ storage }, newName: string, index: number) => {
      const person = storage.get("people").get(index);
      person.set("name", newName);
    },
    []
  );

  // Add person mutation
  const addPerson = useMutation(({ storage }) => {
    const newPerson = new LiveObject({ name: "Grace", age: 45 });
    storage.get("people").push(newPerson);
  }, []);

  return (
    <div>
      {people.map((person, index) => (
        <input
          key={index}
          type="text"
          value={person.name}
          onChange={(e) => updateName(e.target.value, index)}
        />
      ))}
      <button onClick={addPerson}>Add</button>
    </div>
  );
}
