type Todo = {
  text: string;
  checked?: boolean;
};

declare global {
  interface Liveblocks {
    // Each user's Presence, for room.getPresence, room.subscribe("others"), etc.
    Presence: {
      isTyping: boolean;
    };
    // The Storage tree for the room, for useMutation, useStorage, etc.
    StorageV2: {
      todos: Todo[];
    };
  }
}

type Mutable = {
  root: Liveblocks["StorageV2"];
};

//
// NOTE:
// The mutations below will get executed both on the client and the server!
//
// Inside these mutations, `root` is a mutable proxy. Mutate it like you would
// mutate any JavaScript object. Accessing fields on `root` further gives you
// access to nested proxies that you can also mutate. Any changes you make
// anywhere underneath the root will get live serialized to all connected
// clients in the room.
//
// Inside the client, this exact same code will run as an optimistic update.
//
// Any mutation you run locally will travel over the wire as a tuple of
// function name and arguments:
//
//     ["init", []]  // For new rooms only
//     ["addTodo", ["buy bread"]]
//     ["addTodo", ["drink water"]]
//     ["toggleTodo", [0]]
//     ["deleteTodo", [1]]
//
// These means any arguments you pass to this function must be
// JSON-serializable.
//
export function init({ root }: Mutable) {
  root.todos = [];
}

export function addTodo({ root }: Mutable, text: string) {
  root.todos.push({ text });
}

export function toggleTodo({ root }: Mutable, index: number) {
  // NOTE: It's easy to see that in a multiplayer setup, using an index here
  // isn't really the best idea. Better to use unique IDs for each todo.
  const todo = root.todos[index];
  if (todo) {
    todo.checked = !todo.checked;
  }
}

export function deleteTodo({ root }: Mutable, index: number) {
  // NOTE: It's easy to see that in a multiplayer setup, using an index here
  // isn't really the best idea. Better to use unique IDs for each todo.
  root.todos.splice(index, 1);
}
