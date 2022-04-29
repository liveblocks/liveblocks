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
const query = new URLSearchParams(window?.location?.search);
const defaultRoomId = "zustand-todo-list";

const roomSuffix = query.get("room");
let roomId = defaultRoomId;

/**
 * Add a suffix to the room ID using a query parameter.
 * Used for coordinating rooms from outside (e.g. https://liveblocks.io/examples).
 *
 * http://localhost:3000/?room=1234 → zustand-todo-list-1234
 */
if (roomSuffix) {
  roomId = `${defaultRoomId}-${roomSuffix}`;
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
    enterRoom(roomId, {
      todos: [],
    });

    return () => {
      leaveRoom(roomId);
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
