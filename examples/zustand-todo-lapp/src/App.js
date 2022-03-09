import React, { useEffect } from "react";
import useStore from "./store";
import "./App.css";

function WhoIsHere() {
  const othersUsersCount = useStore((state) => state.liveblocks.others.length);

  let message = "";

  if (othersUsersCount === 0) {
    message = "You’re the only one here.";
  } else if (othersUsersCount === 1) {
    message = "There is one other person here.";
  } else {
    message = `There are ${othersUsersCount} other people here`;
  }

  return <div className="who_is_here">{message}</div>;
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
}
