import { useState, useMemo } from "react";
import {
  RoomProvider,
  useOthers,
  useUpdateMyPresence,
  useStorage,
  useMutation,
} from "../liveblocks.config";
import "@liveblocks/react";
import { LiveList } from "@liveblocks/client";
import { useRouter } from "next/router";
import { ClientSideSuspense } from "@liveblocks/react";

function WhoIsHere() {
  const userCount = useOthers((others) => others.length);

  return (
    <div className="who_is_here">There are {userCount} other users online</div>
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

function Example() {
  const [draft, setDraft] = useState("");
  const updateMyPresence = useUpdateMyPresence();
  const todos = useStorage((root) => root.todos);

  const addTodo = useMutation(({ storage }, text) => {
    storage.get("todos").push({ text });
  }, []);

  const deleteTodo = useMutation(({ storage }, index) => {
    storage.get("todos").delete(index);
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
            <button className="delete_button" onClick={() => deleteTodo(index)}>
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Loading() {
  return (
    <div className="loading">
      <img src="https://liveblocks.io/loading.svg" alt="Loading" />
    </div>
  );
}

export default function Page() {
  const roomId = useOverrideRoomId("nextjs-todo-list");

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        isTyping: false,
      }}
      initialStorage={{ todos: new LiveList() }}
    >
      <ClientSideSuspense fallback={<Loading />}>
        {() => <Example />}
      </ClientSideSuspense>
    </RoomProvider>
  );
}

export async function getStaticProps() {
  const API_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` secret in CodeSandbox.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors#codesandbox.`
    : `Create an \`.env.local\` file and add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` environment variable.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors#getting-started.`;

  if (!API_KEY) {
    console.warn(API_KEY_WARNING);
  }

  return { props: {} };
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useOverrideRoomId(roomId: string) {
  const { query } = useRouter();
  const overrideRoomId = useMemo(() => {
    return query?.roomId ? `${roomId}-${query.roomId}` : roomId;
  }, [query, roomId]);

  return overrideRoomId;
}
