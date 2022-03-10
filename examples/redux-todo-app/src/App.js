import React, { useEffect } from "react";
import "./App.css";
import { useDispatch, useSelector } from "react-redux";
import { actions } from "@liveblocks/redux";

import { addTodo, deleteTodo, setDraft } from "./store";

function WhoIsHere() {
  const othersUsersCount = useSelector(
    (state) => state.liveblocks.others.length
  );

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
  const someoneIsTyping = useSelector((state) =>
    state.liveblocks.others.some((user) => user.presence?.isTyping)
  );

  return someoneIsTyping ? (
    <div className="someone_is_typing">Someone is typing</div>
  ) : null;
}

export default function App() {
  const todos = useSelector((state) => state.todos);
  const draft = useSelector((state) => state.draft);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      actions.enterRoom("redux-demo-room", {
        todos: [],
      })
    );

    return () => {
      dispatch(actions.leaveRoom("redux-demo-room"));
    };
  }, [dispatch]);

  if (todos == null) {
    return <div>Loading</div>;
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
      ></input>
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
