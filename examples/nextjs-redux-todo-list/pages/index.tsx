import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { actions } from "@liveblocks/redux";
import { addTodo, deleteTodo, setDraft, State } from "../src/store";
import "./App.css";

let roomId = "nextjs-redux-todo-list";

overrideRoomId(roomId);

function WhoIsHere() {
  const othersUsersCount = useSelector(
    (state: State) => state.liveblocks?.others.length
  );

  return (
    <div className="who_is_here">
      There are {othersUsersCount} other users online
    </div>
  );
}

function SomeoneIsTyping() {
  const someoneIsTyping = useSelector((state: State) =>
    state.liveblocks?.others.some((user) => user.presence?.isTyping)
  );

  return someoneIsTyping ? (
    <div className="someone_is_typing">Someone is typing</div>
  ) : null;
}

export default function App() {
  const todos = useSelector((state:State) => state.todos);
  const draft = useSelector((state:State) => state.draft);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(actions.enterRoom(roomId));

    return () => {
      dispatch(actions.leaveRoom(roomId));
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
function overrideRoomId() {
  if (typeof window === "undefined") {
    return;
  }
  const query = new URLSearchParams(window.location?.search);
  const roomIdSuffix = query.get("roomId");
  if (roomIdSuffix) {
    roomId = `${roomId}-${roomIdSuffix}`;
  }
}
