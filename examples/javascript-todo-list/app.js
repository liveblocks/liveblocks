import { createClient, LiveList } from "@liveblocks/client";

const client = createClient({
  publicApiKey: "pk_YOUR_PUBLIC_KEY",
});

async function run() {
  const room = client.enter("javascript-todo-list");

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

  if (todos == null) {
    todos = new LiveList();
    root.set("todos", todos);
  }

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

  function renderTodos() {
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
    renderTodos();
  });

  renderTodos();
}

run();
