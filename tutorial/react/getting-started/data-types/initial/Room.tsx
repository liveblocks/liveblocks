import { useState } from "react";
import { LiveObject } from "@liveblocks/client";
import { useStorage, useMutation } from "./liveblocks.config";

export function Room() {
  const [itemText, setItemText] = useState("");
  const list = useStorage((root) => root.items);

  // Add mutation
  const addItem = useMutation(
    ({ storage }, e) => {
      e.preventDefault();

      const newItem = new LiveObject({
        complete: false,
        text: itemText,
      });

      const items = storage.get("items");
      items.push(newItem);

      setItemText("");
    },
    [itemText, setItemText]
  );

  return (
    <div>
      <form onSubmit={addItem}>
        <input
          type="text"
          value={itemText}
          onChange={(e) => setItemText(e.target.value)}
        />
        <button>Add</button>
      </form>
      <ul>
        {list.map((item) => (
          <li>
            <input type="checkbox" />
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
