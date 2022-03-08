import React, { useEffect } from "react";
import useStore from "./store";

import "./App.css";

import SomeoneIsTyping from "./SomeoneIsTyping";

const App = () => {
  const {
    draft,
    setDraft,
    todos,
    addTodo,
    deleteTodo,
    liveblocks: { enterRoom, leaveRoom, isStorageLoading },
  } = useStore();

  useEffect(() => {
    enterRoom("zustand-demo-room", {
      todos: [],
    });

    return () => {
      leaveRoom("zustand-demo-room");
    };
  }, [enterRoom, leaveRoom]);

  if (isStorageLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container">
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
      ></input>
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
};

export default App;
