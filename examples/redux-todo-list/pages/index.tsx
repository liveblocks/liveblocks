import React, { useEffect } from "react";
import { actions } from "@liveblocks/redux";
import {
  addTodo,
  deleteTodo,
  setDraft,
  useAppDispatch,
  useAppSelector,
} from "../src/store";

let roomId = "redux-todo-list";

applyExampleRoomId();

function WhoIsHere() {
  const othersUsersCount = useAppSelector(
    (state) => state.liveblocks.others.length
  );

  return (
    <div className="who_is_here">
      There are {othersUsersCount} other users online
    </div>
  );
}

function SomeoneIsTyping() {
  const someoneIsTyping = useAppSelector((state) =>
    state.liveblocks.others.some((user) => user.presence?.isTyping)
  );

  return someoneIsTyping ? (
    <div className="someone_is_typing">Someone is typing</div>
  ) : null;
}

export default function TodoApp() {
  const todos = useAppSelector((state) => state.todos);
  const draft = useAppSelector((state) => state.draft);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(actions.enterRoom(roomId));

    return () => {
      dispatch(actions.leaveRoom());
    };
  }, [dispatch]);

  if (todos == null) {
    return (
      <div className="loading">
        <img src="https://liveblocks.io/loading.svg" alt="Loading" />
      </div>
    );
  }

  return (
    <div className="container">
      <WhoIsHere />
      <input
        className="input"
        type="text"
        placeholder="What needs to be done?"
        value={draft}
        onChange={(e) => dispatch(setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            dispatch(addTodo());
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
              onClick={() => dispatch(deleteTodo(index))}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function applyExampleRoomId() {
  if (typeof window === "undefined") {
    return;
  }

  const query = new URLSearchParams(window?.location?.search);
  const exampleId = query.get("exampleId");

  if (exampleId) {
    roomId = exampleId ? `${roomId}-${exampleId}` : roomId;
  }
}
