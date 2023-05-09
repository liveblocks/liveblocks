import { createClient, LiveList } from "@liveblocks/client";

async function run() {
  let PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";
  let roomId = "javascript-todo-list";

  overrideApiKeyAndRoomId();

  if (!/^pk_(live|test)/.test(PUBLIC_KEY)) {
    console.warn(
      `Replace "${PUBLIC_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
        `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/javascript-todo-list#getting-started.`
    );
  }

  const client = createClient({
    publicApiKey: PUBLIC_KEY,
  });

  type Presence = {
    isTyping: boolean;
  };

  type Todo = {
    text: string;
  };

  type Storage = {
    todos: LiveList<Todo>;
  };

  const room = client.enter<Presence, Storage>(roomId, {
    initialPresence: { isTyping: false },
    initialStorage: { todos: new LiveList() },
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


  const unsubscribe = room.subscribe(
    root,
    (storageUpdates) => {
      for (const update of updates) {
        const {
          type, // "LiveObject", "LiveList", or "LiveMap"
          node,
          updates,
        } = update;
        switch (type) {
          case "LiveObject": {
            // updates["property"]?.type; is "update" or "delete"
            // update.node is the LiveObject that has been updated/deleted
            break;
          }
          case "LiveMap": {
            // updates["key"]?.type; is "update" or "delete"
            // update.node is the LiveMap that has been updated/deleted
            break;
          }
          case "LiveList": {
            // updates[0]?.type; is "delete", "insert", "move", or "set"
            // update.node is the LiveList that has been updated, deleted, or modified
            break;
          }
        }
      }
    },
    { isDeep: true }
  );

  /**
   * This function is used when deploying an example on liveblocks.io.
   * You can ignore it completely if you run the example locally.
   */
  function overrideApiKeyAndRoomId() {
    const query = new URLSearchParams(window?.location?.search);
    const apiKey = query.get("apiKey");
    const roomIdSuffix = query.get("roomId");

    if (apiKey) {
      PUBLIC_KEY = apiKey;
    }

    if (roomIdSuffix) {
      roomId = `${roomId}-${roomIdSuffix}`;
    }
  }

  render();
}

run();
