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
    { id: string; title: string; isCompleted: boolean }[]
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
            description: "Add a todo to the list",
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
          displayTodo: {
            description: "Display a todo",
            parameters: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "The id of the todo to display",
                },
              },
            },
            render: ({ id }: { id: string }) => {
              const todo = todos.find((todo) => todo.id === id);
              return (
                <div>
                  <h3>{todo?.title}</h3>
                  <span>
                    {todo?.isCompleted ? "Completed" : "Not completed"}
                  </span>
                  <button
                    onClick={() => {
                      setTodos((todos) =>
                        todos.map((todo) => {
                          if (todo.id === id) {
                            return { ...todo, isCompleted: !todo.isCompleted };
                          }
                          return todo;
                        })
                      );
                    }}
                  >
                    {todo?.isCompleted ? "Uncheck" : "Check"}
                  </button>
                </div>
              );
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
