import { createClient, LiveList } from "@liveblocks/client";

import { basicAuthStrategy } from "./basic-auth-strategy";

declare global {
  interface Liveblocks {
    Presence: {
      isTyping: boolean;
    };
    Storage: {
      todos: LiveList<Todo>;
    };
  }
}

type Todo = {
  text: string;
};

const ROOM_ID = "basic-auth-todo";

type ElementConstructor<T extends HTMLElement> = {
  new (): T;
};

function getElement<T extends HTMLElement>(
  id: string,
  constructor: ElementConstructor<T>
): T {
  const element = document.getElementById(id);
  if (!(element instanceof constructor)) {
    throw new Error(`Missing #${id}`);
  }
  return element;
}

const authForm = getElement("auth_form", HTMLFormElement);
const usernameInput = getElement("username", HTMLInputElement);
const passwordInput = getElement("password", HTMLInputElement);
const authError = getElement("auth_error", HTMLParagraphElement);
const app = getElement("app", HTMLElement);
const status = getElement("status", HTMLSpanElement);
const whoIsHere = getElement("who_is_here", HTMLSpanElement);
const todoInput = getElement("todo_input", HTMLInputElement);
const someoneIsTyping = getElement("someone_is_typing", HTMLDivElement);
const todosContainer = getElement("todos_container", HTMLDivElement);

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  authError.textContent = "";

  const client = createClient({
    baseUrl: window.location.origin,
    auth: basicAuthStrategy(usernameInput.value, passwordInput.value, ROOM_ID),
  });

  const { room } = client.enterRoom(ROOM_ID, {
    initialPresence: { isTyping: false },
    initialStorage: { todos: new LiveList([]) },
  });

  room.subscribe("status", (nextStatus) => {
    status.textContent = nextStatus;
    status.dataset.status = nextStatus;
  });

  room.subscribe("error", (error) => {
    authError.textContent = error.message;
    app.hidden = true;
    authForm.hidden = false;
  });

  room.subscribe("others", (others) => {
    whoIsHere.textContent = `${others.length} other user${
      others.length === 1 ? "" : "s"
    } online`;
    someoneIsTyping.textContent = others.some((user) => user.presence.isTyping)
      ? "Someone is typing…"
      : "";
  });

  authForm.hidden = true;
  app.hidden = false;

  void room
    .getStorage()
    .then(({ root }) => {
      const todos = root.get("todos");

      function render() {
        todosContainer.replaceChildren();

        todos.forEach((todo, index) => {
          const todoContainer = document.createElement("div");
          todoContainer.className = "todo_container";

          const todoText = document.createElement("div");
          todoText.className = "todo";
          todoText.textContent = todo.text;
          todoContainer.appendChild(todoText);

          const deleteButton = document.createElement("button");
          deleteButton.className = "delete_button";
          deleteButton.type = "button";
          deleteButton.ariaLabel = `Delete ${todo.text}`;
          deleteButton.textContent = "✕";
          deleteButton.addEventListener("click", () => todos.delete(index));
          todoContainer.appendChild(deleteButton);

          todosContainer.appendChild(todoContainer);
        });
      }

      room.subscribe(todos, render);
      render();

      todoInput.addEventListener("keydown", (keyboardEvent) => {
        if (keyboardEvent.key === "Enter" && todoInput.value.trim() !== "") {
          room.updatePresence({ isTyping: false });
          todos.push({ text: todoInput.value.trim() });
          todoInput.value = "";
        } else {
          room.updatePresence({ isTyping: true });
        }
      });

      todoInput.addEventListener("blur", () => {
        room.updatePresence({ isTyping: false });
      });
    })
    .catch((error: unknown) => {
      authError.textContent =
        error instanceof Error ? error.message : "Could not load storage";
      app.hidden = true;
      authForm.hidden = false;
    });
});
