"use client";

import {
  ClientSideSuspense,
  LiveblocksProvider,
  useClient,
  useCopilotChats,
} from "@liveblocks/react/suspense";
import { useEffect, useState } from "react";
import { InlineChat } from "../inline-chat";
import { Popover } from "radix-ui";

export default function Page() {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      // @ts-expect-error
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
    >
      <ClientSideSuspense
        fallback={
          <div className="loading">
            <img src="https://liveblocks.io/loading.svg" alt="Loading" />
          </div>
        }
      >
        <App />
        <DebugClient />
      </ClientSideSuspense>
    </LiveblocksProvider>
  );
}

function App() {
  const [todos, setTodos] = useState<
    { id: number; title: string; isCompleted: boolean }[]
  >([
    {
      id: 1,
      title: "Get groceries",
      isCompleted: false,
    },
    {
      id: 2,
      title: "Demo frontend tool calling",
      isCompleted: false,
    },
  ]);
  const [value, setValue] = useState("");

  const { chats } = useCopilotChats();
  if (chats.length === 0) return null;

  return (
    <div
      style={{
        height: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          maxWidth: "896px",
          marginLeft: "auto",
          marginRight: "auto",
          padding: "4rem",
        }}
      >
        <input
          type="text"
          placeholder="Add a todo"
          value={value}
          onChange={(e) => {
            setValue(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (value.length > 0 && e.key === "Enter") {
              setTodos((todos) => [
                ...todos,
                {
                  id: todos.length + 1,
                  title: value,
                  isCompleted: false,
                },
              ]);
              setValue("");
            }
          }}
          style={{
            position: "relative",
            borderRadius: "0.75rem",
            width: "100%",
            outline: "none",
            fontSize: "1rem",
            border: 0,
            boxShadow:
              "0 0 0 1px rgb(0 0 0 / 4%), 0 2px 6px rgb(0 0 0 / 4%), 0 8px 26px rgb(0 0 0 / 6%)",
            margin: "0 auto",
            padding: 16,
          }}
        />

        {todos.length > 0 && (
          <ul
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              listStyleType: "none",
              padding: "0 0.5rem",
            }}
          >
            {todos.map((todo, index) => {
              return (
                <li
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div className="todo">
                    <span
                      style={{
                        textDecoration: todo.isCompleted
                          ? "line-through"
                          : undefined,
                      }}
                    >
                      {todo.title}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setTodos((todos) =>
                        todos.map((t) => {
                          if (t.id === todo.id) {
                            return { ...todo, isCompleted: !todo.isCompleted };
                          }
                          return t;
                        })
                      );
                    }}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                    }}
                  >
                    {todo.isCompleted
                      ? "Mark as not completed"
                      : "Mark as completed"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div style={{ position: "fixed", bottom: "2rem", right: "2rem" }}>
        <Popover.Root>
          <Popover.Trigger
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "inherit",
              borderRadius: "100%",
              height: "45px",
              width: "45px",
              border: 0,
              padding: "10px",
              background: "none",
              boxShadow:
                "0 0 0 1px rgb(0 0 0 / 4%), 0 2px 6px rgb(0 0 0 / 4%), 0 8px 26px rgb(0 0 0 / 6%)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={32}
              height={32}
              viewBox="0 0 32 32"
              fill="hsl(340, 78%, 51%)"
              strokeWidth={0}
              strokeLinecap="round"
              strokeLinejoin="round"
              role="presentation"
            >
              <path d="M25.805 19.12c-6.996 2.312-9.325 4.642-11.637 11.638-.19.575-1.003.575-1.193 0-2.312-6.996-4.642-9.326-11.637-11.637-.576-.19-.576-1.004 0-1.194 6.996-2.311 9.325-4.641 11.637-11.637.19-.575 1.003-.575 1.193 0 2.312 6.996 4.642 9.326 11.637 11.637.575.19.575 1.004 0 1.194ZM30.879 7.632c-3.497 1.155-4.663 2.32-5.82 5.82-.094.287-.5.287-.596 0-1.155-3.498-2.32-4.664-5.82-5.82-.287-.095-.287-.501 0-.597 3.498-1.155 4.663-2.32 5.82-5.82a.314.314 0 0 1 .596 0c1.155 3.498 2.321 4.663 5.82 5.82.287.094.287.5 0 .597Z"></path>
            </svg>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="top"
              align="end"
              sideOffset={10}
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: "0.75rem",
                width: "450px",
                height: "600px",
                boxShadow:
                  "0 0 0 1px rgb(0 0 0 / 4%), 0 2px 6px rgb(0 0 0 / 4%), 0 8px 26px rgb(0 0 0 / 6%)",
              }}
            >
              <InlineChat
                chatId={chats[0].id}
                context={{
                  todos: {
                    description:
                      "A list of todos with id, title and completion status",
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
                          id: todos.length + 1,
                          title,
                          isCompleted: false,
                        },
                      ]);
                    },
                  },
                  markTodoAsCompleted: {
                    description: "Mark a todo as completed",
                    parameters: {
                      type: "object",
                      properties: {
                        ids: {
                          type: "array",
                          description:
                            "The ids of the todo to mark as completed",
                        },
                      },
                    },
                    execute: ({ ids }: { ids: number[] }) => {
                      setTodos((todos) =>
                        todos.map((todo) => {
                          if (ids.includes(todo.id)) {
                            return { ...todo, isCompleted: true };
                          }
                          return todo;
                        })
                      );
                    },
                  },
                  displayTodo: {
                    description: "Display a todo",
                    parameters: {
                      type: "object",
                      properties: {
                        ids: {
                          type: "array",
                          description: "The ids of the todo to display",
                        },
                      },
                    },
                    render: ({ ids }: { ids: number[] }) => {
                      return (
                        <div
                          style={{
                            display: "flex",
                            borderRadius: "0.75rem",
                            boxShadow:
                              "0 0 0 1px rgb(0 0 0 / 4%), 0 2px 6px rgb(0 0 0 / 4%), 0 8px 26px rgb(0 0 0 / 6%)",
                            padding: "1rem",
                            backgroundColor: "white",
                            margin: "1rem 0",
                            gap: "1rem",
                            flexDirection: "column",
                          }}
                        >
                          {ids.map((id) => {
                            const todo = todos.find((todo) => todo.id === id);
                            if (todo === undefined) {
                              return null;
                            }

                            return (
                              <div
                                key={todo.id}
                                style={{
                                  display: "flex",
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span>{todo.title}</span>
                                <span
                                  style={{
                                    opacity: 0.5,
                                  }}
                                >
                                  {todo.isCompleted
                                    ? "Completed"
                                    : "Not completed"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    },
                  },
                }}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
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
