import React, { useEffect } from "react";
import useStore from "../src/store";

import styles from "./index.module.css";

export default function StorageDemo() {
  const {
    todos,
    addTodo,
    deleteTodo,
    draft,
    setDraft,
    liveblocks: { enter, leave, isStorageLoading },
  } = useStore();

  useEffect(() => {
    enter("example-storage", {
      todos: [],
    });

    return () => {
      leave("example-storage");
    };
  }, [enter, leave]);

  if (isStorageLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className={styles.container}>
        <input
          className={styles.input}
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
        {todos.map((todo, index) => {
          return (
            <div className={styles.todo_container} key={index}>
              <div className={styles.todo}>{todo.text}</div>
              <button
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
    </div>
  );
}
