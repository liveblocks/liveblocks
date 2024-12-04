import { useState, useMemo } from "react";
import {
  RoomProvider,
  useOthers,
  useUpdateMyPresence,
  useStorage as useOriginalStorage,
  useMutation as useOriginalMutation,
} from "@liveblocks/react/suspense";
import "@liveblocks/react";
import { useRouter } from "next/router";
import { ClientSideSuspense } from "@liveblocks/react";
import * as config from "../liveblocks.config";

/* prettier-ignore */
/* Demo helper, please ignore 🙈 */ function useMutations<T>(config: T): {
/* Demo helper, please ignore 🙈 */   [K in keyof T]: T[K] extends (first: any, ...args: infer A) => infer R
/* Demo helper, please ignore 🙈 */     ? (...args: A) => R
/* Demo helper, please ignore 🙈 */     : never;
/* Demo helper, please ignore 🙈 */ } {
/* Demo helper, please ignore 🙈 */   return config as any;
/* Demo helper, please ignore 🙈 */ }

/* prettier-ignore */
/* Demo helper, please ignore 🙈 */ function useStorage<T>(
/* Demo helper, please ignore 🙈 */     selector: (root: Liveblocks["StorageV2"]) => T,
/* Demo helper, please ignore 🙈 */     isEqual?: (a: T, b: T) => boolean
/* Demo helper, please ignore 🙈 */   ): T {
/* Demo helper, please ignore 🙈 */     return useOriginalStorage(selector as any, isEqual);
/* Demo helper, please ignore 🙈 */   }

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

  const { addTodo, toggleTodo, deleteTodo } = useMutations(config);

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
          if (draft && e.key === "Enter") {
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
            <div className="todo" onClick={() => toggleTodo(index)}>
              <span
                style={{
                  cursor: "pointer",
                  textDecoration: todo.checked ? "line-through" : undefined,
                }}
              >
                {todo.text}
              </span>
            </div>
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
  const roomId = useExampleRoomId("nextjs-todo-list");

  return (
    <RoomProvider id={roomId} initialPresence={{ isTyping: false }}>
      <ClientSideSuspense fallback={<Loading />}>
        <Example />
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
function useExampleRoomId(roomId: string) {
  const { query } = useRouter();
  const exampleRoomId = useMemo(() => {
    return query?.exampleId ? `${roomId}-${query.exampleId}` : roomId;
  }, [query, roomId]);

  return exampleRoomId;
}
