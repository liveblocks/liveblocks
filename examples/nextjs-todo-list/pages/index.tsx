import { RoomProvider, useList, useUpdateMyPresence } from "@liveblocks/react";
import React, { useState } from "react";
import SomeoneIsTyping from "../components/SomeoneIsTyping";
import WhosHere from "../components/WhosHere";
import styles from "./index.module.css";

type Todo = {
  text: string;
};

export default function Room() {
  return (
    <RoomProvider id="todo-list-react">
      <StorageDemo />
    </RoomProvider>
  );
}

function StorageDemo() {
  const todos = useList<Todo>("todos");
  const updateMyPresence = useUpdateMyPresence();
  const [draft, setDraft] = useState("");

  if (todos == null) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <WhosHere />
      <input
        className={styles.input}
        type="text"
        placeholder="What needs to be done?"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          updateMyPresence({ isTyping: true });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            todos.push({ text: draft });
            setDraft("");
            updateMyPresence({ isTyping: false });
          }
        }}
        onBlur={() => updateMyPresence({ isTyping: false })}
      ></input>
      <SomeoneIsTyping />
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
