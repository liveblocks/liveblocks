import React, { useEffect, useState } from "react";
import styles from "./index.module.css";
import { enterRoom, leaveRoom } from "@liveblocks/redux";
import { useAppDispatch, useAppSelector } from "../src/hooks";

export default function StorageDemo() {
  const todos = useAppSelector((state) => state.todos);
  const draft = useAppSelector((state) => state.draft);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      enterRoom("example-storage", {
        todos: [],
      })
    );

    return () => {
      dispatch(leaveRoom("example-storage"));
    };
  }, [dispatch]);

  const [text, setText] = useState("");

  if (todos == null) {
    return <div>Loading</div>;
  }

  return (
    <div className={styles.container}>
      <input
        className={styles.input}
        type="text"
        placeholder="What needs to be done?"
        value={draft}
        onChange={(e) => dispatch({ type: "SET_DRAFT", draft: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            dispatch({ type: "ADD_TODO" });
          }
        }}
      ></input>
      {todos.map((todo, index) => {
        return (
          <div className={styles.todo_container} key={index}>
            <div className={styles.todo}>{todo.text}</div>
            <button onClick={() => dispatch({ type: "DELETE_TODO", index })}>
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
