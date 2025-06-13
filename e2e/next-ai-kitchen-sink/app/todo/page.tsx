"use client";

import { defineAiTool } from "@liveblocks/core";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RegisterAiKnowledge,
  useSendAiMessage,
} from "@liveblocks/react/suspense";
import { useCallback, useState } from "react";
import { Popover } from "radix-ui";
import {
  AiChat,
  AiChatComponentsEmptyProps,
  AiTool,
} from "@liveblocks/react-ui";

export default function Page() {
  const [todos, setTodos] = useState<
    { id: number; title: string; isCompleted: boolean }[]
  >([
    {
      id: 9823,
      title: "Get groceries",
      isCompleted: true,
    },
    {
      id: 72,
      title: "Go to the gym",
      isCompleted: false,
    },
    {
      id: 1313,
      title: "Cook dinner",
      isCompleted: false,
    },
  ]);
  const [value, setValue] = useState("");

  const toggleTodo = useCallback((id: number) => {
    setTodos((todos) =>
      todos.map((todo) => {
        if (todo.id === id) {
          return { ...todo, isCompleted: !todo.isCompleted };
        }
        return todo;
      })
    );
  }, []);

  const addTodo = useCallback((title: string) => {
    setTodos((todos) => [
      ...todos,
      {
        id: Math.floor(Math.random() * 10000),
        title,
        isCompleted: false,
      },
    ]);
  }, []);

  const deleteTodos = useCallback((ids: number[]) => {
    setTodos((todos) => todos.filter((todo) => !ids.includes(todo.id)));
  }, []);

  return (
    <main className="h-screen w-full">
      <div className="flex flex-col mx-auto px-4 max-w-4xl py-8">
        <input
          type="text"
          placeholder="Add a todo"
          value={value}
          onChange={(e) => {
            setValue(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (value.length > 0 && e.key === "Enter") {
              addTodo(value);
              setValue("");
            }
          }}
          className="shadow-[0_0_0_1px_rgb(0_0_0_/_4%),_0_2px_6px_rgb(0_0_0_/_4%),_0_8px_26px_rgb(0_0_0_/_6%)] rounded-lg p-3 w-full border-0 mb-4"
        />

        {todos.length > 0 && (
          <ul className="flex flex-col gap-4">
            {todos.map((todo, index) => {
              return (
                <li
                  key={index}
                  className={`flex space-between items-center ${todo.isCompleted ? "line-through opacity-50" : "opacity-100"}`}
                  onClick={() => toggleTodo(todo.id)}
                >
                  {todo.title}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="fixed bottom-8 right-8">
        <Popover.Root open>
          <Popover.Trigger className="inline-flex items-center justify-center rounded-full p-4 shadow-[0_0_0_1px_#0000000a,0_2px_6px_#0000000f,0_8px_26px_#00000014] hover:shadow-[0_0_0_1px_#00000014,0_2px_6px_#00000014,0_8px_26px_#00000014] dark:shadow-[0_0_0_1px_#ffffff0f] dark:hover:shadow-[0_0_0_1px_#ffffff14,0_2px_6px_#ffffff14,0_8px_26px_#ffffff14]">
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
              className="flex flex-col w-[450px] h-[600px] shadow-[0_0_0_1px_#0000000a,0_2px_6px_#0000000f,0_8px_26px_#00000014] dark:shadow-[0_0_0_1px_#ffffff0f] rounded-xl"
            >
              <LiveblocksProvider
                authEndpoint="/api/auth/liveblocks"
                // @ts-expect-error
                baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
              >
                <ClientSideSuspense fallback={null}>
                  <AiChat
                    chatId="todo"
                    layout="compact"
                    components={{
                      Empty: AiChatEmptyComponent,
                    }}
                    tools={{
                      listTodos: defineAiTool()({
                        description: "List all todos",
                        parameters: {
                          type: "object",
                          properties: {
                            ids: {
                              type: "array",
                              description: "The requested todo items to list",
                              items: { type: "number" },
                            },
                          },
                          required: ["ids"],
                          additionalProperties: false,
                        },
                        execute: async (args) => {
                          const { ids } = args;
                          if (ids.length === 0) {
                            return { data: { todos } };
                          } else {
                            return {
                              data: {
                                todos: todos.filter((t) => ids.includes(t.id)),
                              },
                            };
                          }
                        },
                      }),

                      addTodos: defineAiTool()({
                        description: "Add a new todo item to the list",
                        parameters: {
                          type: "object",
                          properties: {
                            titles: {
                              type: "array",
                              description:
                                "The titles of the new items to add to the list",
                              items: { type: "string" },
                            },
                          },
                          required: ["titles"],
                          additionalProperties: false,
                        },
                        execute: ({ titles }) => {
                          for (const title of titles) {
                            addTodo(title);
                          }
                        },
                      }),

                      toggleTodo: defineAiTool()({
                        description: "Toggle a todo's completion status",
                        parameters: {
                          type: "object",
                          properties: {
                            id: {
                              description: "The id of the todo to toggle",
                              type: "number",
                            },
                          },
                          required: ["id"],
                          additionalProperties: false,
                        },
                        execute: ({ id }) => {
                          toggleTodo(id);
                        },
                        render: () => (
                          <AiTool>
                            <AiTool.Inspector />
                          </AiTool>
                        ),
                      }),

                      deleteTodos: defineAiTool<{ deletedTitles: string[] }>()({
                        description: "Deletes one or more todo items by ID",
                        parameters: {
                          type: "object",
                          properties: {
                            ids: {
                              description: "The ids of the todo item to delete",
                              type: "array",
                              items: { type: "number" },
                            },
                          },
                          required: ["ids"],
                          additionalProperties: false,
                        },

                        // TODO Add followUp: true here later?
                        render: ({ result, types }) => (
                          <AiTool>
                            <AiTool.Confirmation
                              types={types}
                              variant="destructive"
                              confirm={({ ids }) => {
                                const deletedTitles = todos
                                  .filter((t) => ids.includes(t.id))
                                  .map((todo) => todo.title);

                                deleteTodos(ids);
                                return { data: { deletedTitles } };
                              }}
                            >
                              Okay to delete?
                            </AiTool.Confirmation>

                            {result?.data ? (
                              <div>
                                Deleted:
                                <ul>
                                  {result.data.deletedTitles?.map(
                                    (title, i: number) => (
                                      <li key={i}>{title}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                            ) : result?.cancelled ? (
                              <div>The request was denied</div>
                            ) : null}
                          </AiTool>
                        ),
                      }),
                    }}
                    className="rounded-xl"
                  />

                  <RegisterAiKnowledge
                    description="A list of todos"
                    value={todos}
                  />
                </ClientSideSuspense>
              </LiveblocksProvider>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </main>
  );
}

const CHAT_SUGGESTIONS = [
  {
    label: "List all todos",
    message: "List all my todos",
  },
  {
    label: "Add new todo",
    message: "Add a todo titled 'Buy milk'",
  },
  {
    label: "List completed todos",
    message: "List all completed todos",
  },
  {
    label: "Delete todos",
    message: "Delete the second and third todos",
  },
];

function AiChatEmptyComponent({ chatId }: AiChatComponentsEmptyProps) {
  const sendMessage = useSendAiMessage(chatId);

  return (
    <div className="justify-end h-full flex flex-col gap-4 px-6 pb-4">
      <h2 className="text-xl font-semibold">How can I help you?</h2>

      {/* Suggestion Tags */}
      <div className="flex flex-wrap gap-2">
        {CHAT_SUGGESTIONS.map(({ label, message }) => (
          <button
            key={label}
            onClick={() => sendMessage(message)}
            className="text-sm rounded-full border border-[var(--lb-foreground-subtle)] px-4 py-2 font-medium"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
