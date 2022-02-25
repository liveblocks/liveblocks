import React, { useEffect, useState } from "react";
import styles from "./index.module.css";
import { useDispatch, useSelector, useStore } from "react-redux";
import { AppState } from "../store";

export default function StorageDemo() {
  const store = useStore();
  const todos = useSelector((state: AppState) => state.todos);
  const dispatch = useDispatch();

  useEffect(() => {
    store.enterRoom("example-storage", {
      todos: [],
    });

    return () => store.leaveRoom("example-storage");
  }, []);

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
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            dispatch({ type: "ADD_TODO", text });
            setText("");
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
