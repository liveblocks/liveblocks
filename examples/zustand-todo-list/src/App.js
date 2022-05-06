import React, { useEffect } from "react";
import useStore from "./store";
import "./App.css";

function WhoIsHere() {
  const othersUsersCount = useStore((state) => state.liveblocks.others.length);

  return (
    <div className="who_is_here">
      There are {othersUsersCount} other users online
    </div>
  );
}

function SomeoneIsTyping() {
  const others = useStore((state) => state.liveblocks.others);

  const someoneIsTyping = others.some((user) => user.presence?.isTyping);

  return someoneIsTyping ? (
    <div className="someone_is_typing">Someone is typing</div>
  ) : null;
}

export default function App() {
  const {
    draft,
    setDraft,
    todos,
    addTodo,
    deleteTodo,
    liveblocks: { enterRoom, leaveRoom, isStorageLoading },
  } = useStore();

  useEffect(() => {
    enterRoom("zustand-todo-list", {
      todos: [],
    });

    return () => {
      leaveRoom("zustand-todo-list");
    };
  }, [enterRoom, leaveRoom]);

  if (isStorageLoading) {
    return null;
  }

  return (
    <div className="container">
      <WhoIsHere />
      <input
        className="input"
        type="text"
        placeholder="What needs to be done?"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            addTodo();
          }
        }}
      />
      <SomeoneIsTyping />
      {todos.map((todo, index) => {
        return (
          <div className="todo_container" key={index}>
            <div className="todo">{todo.text}</div>
            <button
              className="delete_button"
              onClick={() => {
                deleteTodo(index);
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
