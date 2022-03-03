import React, { useEffect } from "react";
import useStore from "../store";
import SomeoneIsTyping from "../components/SomeoneIsTyping";
import WhosHere from "../components/WhoIsHere";

import styles from "../styles/Home.module.css";

export default function StorageDemo() {
  const {
    todos,
    addTodo,
    deleteTodo,
    draft,
    setDraft,
    liveblocks: { enterRoom, leaveRoom, isStorageLoading },
  } = useStore();

  useEffect(() => {
    // Enter liveblocks room on unmount and start syncing Liveblocks and Zustand store
    enterRoom("zustand-todo-list", {
      todos: [],
    });

    return () => {
      // Leave liveblocks room on unmount and stop syncing Liveblocks and Zustand store
      leaveRoom("zustand-todo-list");
    };
  }, [enterRoom, leaveRoom]);

  if (isStorageLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className={styles.container}>
        <WhosHere />
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
        <SomeoneIsTyping />
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
