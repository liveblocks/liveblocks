"use client";

import {
  ClientSideSuspense,
  LiveblocksProvider,
  useClient,
  useCopilotChats,
} from "@liveblocks/react/suspense";
import { useEffect, useState } from "react";
import { InlineChat } from "../inline-chat";

export default function Page() {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      // @ts-expect-error
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
    >
      <ClientSideSuspense fallback={<div>Loading...</div>}>
        <App />
        <DebugClient />
      </ClientSideSuspense>
    </LiveblocksProvider>
  );
}

function App() {
  const { chats } = useCopilotChats();

  const [todos, setTodos] = useState<
    { id: string; title: string; isCompleted: false }[]
  >([
    {
      id: crypto.randomUUID(),
      title: "Todo 1",
      isCompleted: false,
    },
  ]);

  if (chats.length === 0) {
    return <div>No chats available</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <span>{todo.title}</span>
          </li>
        ))}
      </ul>

      <InlineChat
        chatId={chats[0].id}
        context={{
          todos: {
            description: "A list of todos with id, title and completion status",
            value: `${JSON.stringify(todos)}`,
          },
        }}
        tools={{
          addTodo: {
            parameters: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "The title of the todo to add",
                },
              },
            },
            execute: ({ title }: { title: string }) => {
              setTodos((todos) => [
                ...todos,
                {
                  id: crypto.randomUUID(),
                  title,
                  isCompleted: false,
                },
              ]);
            },
          },
        }}
      />
    </div>
  );
}

function DebugClient() {
  const client = useClient();

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).lbClient = client;
    }
  }, [client]);

  return null;
}
