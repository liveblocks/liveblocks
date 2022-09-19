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

  const room = client.enter(roomId, {
    initialPresence: { isTyping: true },
    initialStorage: { todos: new LiveList() },
  });

  const whoIsHere = document.getElementById("who_is_here");
  const todoInput = document.getElementById("todo_input");
  const someoneIsTyping = document.getElementById("someone_is_typing");
  const todosContainer = document.getElementById("todos_container");

  room.subscribe("others", (others) => {
    whoIsHere.innerHTML = `There are ${others.count} other users online`;

    someoneIsTyping.innerHTML = others
      .toArray()
      .some((user) => user.presence?.isTyping)
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

    for (let i = 0; i < todos.length; i++) {
      const todo = todos.get(i);

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
        todos.delete(i);
      });
      todoContainer.appendChild(deleteButton);

      todosContainer.appendChild(todoContainer);
    }
  }

  room.subscribe(todos, () => {
    render();
  });

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
