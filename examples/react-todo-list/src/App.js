import { useState } from "react";
import { RoomProvider, useOthers, useUpdateMyPresence, useStorage, useMutation } from "./liveblocks.config";
import { LiveList } from "@liveblocks/client";
import { ClientSideSuspense } from "@liveblocks/react";

function WhoIsHere() {
  const userCount = useOthers((others) => others.length);

  return (
    <div className="who_is_here">
      There are {userCount} other users online
    </div>
  );
}

function SomeoneIsTyping() {
  const someoneIsTyping = useOthers((others) =>
    others.some((other) => other.presence.isTyping)
  );

  return (
    <div className="someone_is_typing">
      {someoneIsTyping ? "Someone is typing..." : ""}
    </div>
  );
}

function Room() {
  const [draft, setDraft] = useState("");
  const updateMyPresence = useUpdateMyPresence();
  const todos = useStorage((root) => root.todos);

  const addTodo = useMutation(({ root }, text) => {
    root.get("todos").push({ text })
  }, []);

  const deleteTodo = useMutation(({ root }, index) => {
    root.get("todos").delete(index);
  }, []);

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
            addTodo(draft);
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
              onClick={() => deleteTodo(index)}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

let roomId = "react-todo-list";
overrideRoomId();

export default function App() {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ isTyping: false }}
      initialStorage={{ todos: new LiveList() }}
    >
      <ClientSideSuspense fallback={<div>Loading...</div>}>
        {() => <Room />}
      </ClientSideSuspense>
    </RoomProvider>
  )
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function overrideRoomId() {
  const query = new URLSearchParams(window?.location?.search);
  const roomIdSuffix = query.get("roomId");

  if (roomIdSuffix) {
    roomId = `${roomId}-${roomIdSuffix}`;
  }
}
