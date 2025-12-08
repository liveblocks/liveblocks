import { createClient, LiveList } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    // Each user's Presence, for room.getPresence, room.subscribe("others"), etc.
    Presence: {
      isTyping: boolean;
    };
    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: {
      todos: LiveList<Todo>;
    };
  }
}

type Todo = {
  text: string;
};

async function run() {
  let PUBLIC_KEY =
    "pk_dev_9YkDY4Pe5N2E267kvt00Z-Y7LiVss5JkqAEUCXnOYWg3fglpeax_eLxF0XhSxEjv";
  let roomId = "javascript-todo-list";

  applyExampleRoomIdAndApiKey();

  if (!/^pk_/.test(PUBLIC_KEY)) {
    console.warn(
      `Replace "${PUBLIC_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
        `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/javascript-todo-list#getting-started.`
    );
  }

  const client = createClient({
    publicApiKey: PUBLIC_KEY,
    badgeLocation: "top-right",
  });

  // If you no longer need the room (for example when you unmount your
  // component), make sure to call leave()
  const { room, leave } = client.enterRoom(roomId, {
    initialPresence: { isTyping: false },
    initialStorage: { todos: new LiveList([]) },
  });

  const whoIsHere = document.getElementById("who_is_here") as HTMLDivElement;
  const todoInput = document.getElementById("todo_input") as HTMLInputElement;
  const someoneIsTyping = document.getElementById(
    "someone_is_typing"
  ) as HTMLDivElement;
  const todosContainer = document.getElementById(
    "todos_container"
  ) as HTMLDivElement;

  room.subscribe("others", (others) => {
    whoIsHere.innerHTML = `There are ${others.length} other users online`;

    someoneIsTyping.innerHTML = others.some((user) => user.presence.isTyping)
      ? "Someone is typing..."
      : "";
  });

  const { root } = await room.getStorage();

  let todos = root.get("todos");

  todoInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      room.updatePresence({ isTyping: false });
      todos.push({ text: todoInput.value });
      todoInput.value = "";
    } else {
      room.updatePresence({ isTyping: true });
    }
  });

  todoInput.addEventListener("blur", () => {
    room.updatePresence({ isTyping: false });
  });

  function render() {
    todosContainer.innerHTML = "";

    todos.forEach((todo, index) => {
      const todoContainer = document.createElement("div");
      todoContainer.classList.add("todo_container");

      const todoText = document.createElement("div");
      todoText.classList.add("todo");
      todoText.innerHTML = todo.text;
      todoContainer.appendChild(todoText);

      const deleteButton = document.createElement("button");
      deleteButton.classList.add("delete_button");
      deleteButton.innerHTML = "✕";
      deleteButton.addEventListener("click", () => {
        todos.delete(index);
      });
      todoContainer.appendChild(deleteButton);

      todosContainer.appendChild(todoContainer);
    });
  }

  room.subscribe(todos, () => {
    render();
  });

  /**
   * This function is used when deploying an example on liveblocks.io.
   * You can ignore it completely if you run the example locally.
   */
  function applyExampleRoomIdAndApiKey() {
    if (typeof window === "undefined") {
      return;
    }

    const query = new URLSearchParams(window?.location?.search);
    const exampleId = query.get("exampleId");
    const apiKey = query.get("apiKey");

    if (exampleId) {
      roomId = exampleId ? `${roomId}-${exampleId}` : roomId;
    }

    if (apiKey) {
      PUBLIC_KEY = apiKey;
    }
  }

  render();
}

run();
