import React, { useEffect } from "react";
import styles from "./index.module.css";
import { actions } from "@liveblocks/redux";
import { useAppDispatch, useAppSelector } from "../hooks";
import WhosHere from "../components/WhosHere";
import SomeoneIsTyping from "../components/SomeoneIsTyping";
import { addTodo, deleteTodo, onInputBlur, setDraft } from "../store";

export default function TodoList() {
  const todos = useAppSelector((state) => state.todos);
  const draft = useAppSelector((state) => state.draft);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      actions.enterRoom("example-storage", {
        todos: [],
      })
    );

    return () => {
      dispatch(actions.leaveRoom("example-storage"));
    };
  }, [dispatch]);

  if (todos == null) {
    return <div>Loading</div>;
  }

  return (
    <div className={styles.container}>
      <WhosHere />
      <input
        className={styles.input}
        type="text"
        placeholder="What needs to be done?"
        value={draft}
        onChange={(e) => dispatch(setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            dispatch(addTodo());
          }
        }}
        onBlur={() => dispatch(onInputBlur())}
      ></input>
      <SomeoneIsTyping />
      {todos.map((todo, index) => {
        return (
          <div className={styles.todo_container} key={index}>
            <div className={styles.todo}>{todo.text}</div>
            <button
              className={styles.delete_button}
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
