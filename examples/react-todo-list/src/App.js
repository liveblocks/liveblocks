import { useState } from "react";
import { useOthers, useUpdateMyPresence, useList } from "@liveblocks/react";
import "./App.css";

function WhoIsHere() {
  const others = useOthers();

  return (
    <div className="who_is_here">
      There are {others.count} other users online
    </div>
  );
}

function SomeoneIsTyping() {
  const someoneIsTyping = useOthers()
    .toArray()
    .some((user) => user.presence?.isTyping);

  return (
    <div className="someone_is_typing">
      {someoneIsTyping ? "Someone is typing..." : ""}
    </div>
  );
}

export default function App() {
  const [draft, setDraft] = useState("");
  const updateMyPresence = useUpdateMyPresence();
  const todos = useList("todos");

  if (todos == null) {
    return null;
  }

  return (
    <div className="container">
      <WhoIsHere />
      <input
        type="text"
        placeholder="What needs to be done?"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          updateMyPresence({ isTyping: true });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            updateMyPresence({ isTyping: false });
            todos.push({ text: draft });
            setDraft("");
          }
        }}
        onBlur={() => updateMyPresence({ isTyping: false })}
      />
      <SomeoneIsTyping />
      {todos.map((todo, index) => {
        return (
          <div key={index} className="todo_container">
            <div className="todo">{todo.text}</div>
            <button
              className="delete_button"
              onClick={() => todos.delete(index)}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
