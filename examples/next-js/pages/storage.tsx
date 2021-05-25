import { useStorage, List, Record, RoomProvider } from "@liveblocks/react";
import React, { useState } from "react";

// Liveblocks
type State = {
  todos: List<Record<Todo>>;
};

// React
// type State = {
//   todos: Array<Todo>;
// };

type Todo = {
  text: string | null;
};

export default function Room() {
  return (
    <RoomProvider
      id="example-storage"
      defaultPresence={() => ({
        cursor: null,
      })}
    >
      <StorageDemo />
    </RoomProvider>
  );
}

function StorageDemo() {
  const [text, setText] = useState("");

  // Liveblocks
  const [state, { createRecord, pushItem, deleteItem }] = useStorage<State>(
    ({ createList }) => ({
      todos: createList(),
    })
  );

  // React
  // const [state, setState] = useState<State>(() => ({ todos: [] }));

  if (state == null) {
    return (
      <div className="container max-w-md mx-auto min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto">
      <input
        className="w-full bg-white px-3.5 py-2 shadow-sm hover:shadow focus:shadow focus:outline-none rounded-lg mt-12 mb-2"
        type="text"
        placeholder="What needs to be done?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // Liveblocks
            pushItem(state.todos, createRecord({ text }));

            // React
            // setState({ todos: state.todos.concat({ text }) });

            setText("");
          }
        }}
      ></input>
      {state.todos.map((item, index) => {
        return (
          <div
            className="px-3.5 py-2 flex justify-between items-center"
            key={index}
          >
            <div style={{ flexGrow: 1 }}>{item.text}</div>
            <button
              className="focus:outline-none"
              onClick={() => {
                // Liveblocks
                deleteItem(state.todos, index);

                // React
                // setState({ todos: state.todos.filter((_, i) => i !== index) });
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
