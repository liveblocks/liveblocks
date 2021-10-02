import { RoomProvider, useList } from "@liveblocks/react";
import React, { useState } from "react";
import LoadingIndicator from "../../components/LoadingIndicator";
import styles from "./index.module.css";

type Todo = {
  text: string;
};

export default function Room() {
  return (
    <RoomProvider id="example-storage">
      <StorageDemo />
    </RoomProvider>
  );
}

function StorageDemo() {
  const todos = useList<Todo>("todos");
  const [text, setText] = useState("");

  if (todos == null) {
    return <LoadingIndicator />;
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
            todos.push({ text });
            setText("");
          }
        }}
      ></input>
      {todos.map((todo, index) => {
        return (
          <div className={styles.todo_container} key={index}>
            <div className={styles.todo}>{todo.text}</div>
            <button onClick={() => todos.delete(index)}>✕</button>
          </div>
        );
      })}
    </div>
  );
}
