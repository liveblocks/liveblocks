"use client";

import { use } from "react";
import { defineAiTool } from "@liveblocks/client";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RegisterAiKnowledge,
  RegisterAiTool,
} from "@liveblocks/react/suspense";
import { AiChat, AiTool } from "@liveblocks/react-ui";

import { useCallback, useEffect, useState } from "react";
import { Popover } from "radix-ui";

function DarkModeToggle() {
  const [exposed, setExposed] = useState<boolean>(true);
  const [mode, setMode] = useState<"dark" | "light">("light");

  const toggleExposeTool = useCallback(() => {
    setExposed((exposeTool) => !exposeTool);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode]);

  useEffect(() => {
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [mode]);

  return (
    <div className="flex flex-col mx-auto px-4 max-w-4xl py-8 border-b-1 dark:border-neutral-700">
      <label>
        <input
          data-testid="expose-dark-mode-checkbox"
          type="checkbox"
          checked={exposed}
          onChange={() => toggleExposeTool()}
        />{" "}
        Expose dark mode as knowledge & tool
      </label>

      {exposed ? (
        <RegisterAiKnowledge
          description="The current mode of the app"
          value={mode}
        />
      ) : null}

      {exposed ? (
        <RegisterAiTool
          name="changeDarkMode"
          tool={defineAiTool()({
            description: "Change the dark mode of the app",
            parameters: {
              type: "object",
              properties: {
                mode: {
                  type: "string",
                  enum: ["light", "dark"],
                },
              },
              required: ["mode"],
              additionalProperties: false,
            },
            execute: ({ mode }) => {
              setMode(mode);
              return {
                data: { ok: true, message: `Dark mode changed to ${mode}` },
              };
            },
            render: () => <AiTool />,
          })}
        />
      ) : null}

      <label>
        <input
          data-testid="dark-mode-toggle"
          type="checkbox"
          checked={mode === "dark"}
          onChange={() => toggleDarkMode()}
        />{" "}
        Dark mode {mode === "light" ? "☀️" : "🌙"}
      </label>
    </div>
  );
}

function MyNickName() {
  const [enabled, setEnabled] = useState(false);
  const toggle = useCallback(() => {
    setEnabled((enabled) => !enabled);
  }, []);

  return (
    <>
      {enabled ? (
        <RegisterAiKnowledge description="My internet nick name" value="nvie" />
      ) : null}
      <div className="flex flex-col mx-auto px-4 max-w-4xl py-8 border-b-1 dark:border-neutral-700">
        <label>
          <input
            data-testid="share-nickname-checkbox"
            type="checkbox"
            checked={enabled}
            onChange={() => toggle()}
          />
          <span className="ml-2">Share my nickname</span>
        </label>
      </div>
    </>
  );
}

function TodoApp() {
  const [todos, setTodos] = useState<
    { id: number; title: string; isCompleted: boolean }[]
  >([
    {
      id: 1,
      title: "Get groceries",
      isCompleted: true,
    },
    {
      id: 2,
      title: "Go to the gym",
      isCompleted: false,
    },
    {
      id: 3,
      title: "Cook dinner",
      isCompleted: false,
    },
  ]);
  const [value, setValue] = useState("");

  return (
    <div className="flex flex-col mx-auto px-4 max-w-4xl py-8">
      <RegisterAiKnowledge
        id="current-view"
        description="The current view inside my app"
        value="Todo list"
      />

      <RegisterAiKnowledge
        description="A list of todos with id, title and completion status"
        value={todos}
      />

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
        className="shadow-[0_0_0_1px_rgb(0_0_0_/_4%),_0_2px_6px_rgb(0_0_0_/_4%),_0_8px_26px_rgb(0_0_0_/_6%)] dark:shadow-[0_0_0_1px_rgb(255_255_255_/_10%),_0_2px_6px_rgb(0_0_0_/_20%),_0_8px_26px_rgb(0_0_0_/_30%)] rounded-lg p-3 w-full border-0 mb-4 dark:bg-neutral-800 dark:text-neutral-100"
      />

      {todos.length > 0 && (
        <ul className="flex flex-col gap-4">
          {todos.map((todo, index) => {
            return (
              <li
                key={index}
                className={`flex space-between items-center cursor-pointer p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 ${todo.isCompleted ? "line-through opacity-50" : "opacity-100"}`}
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
              >
                {todo.title}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AnotherApp() {
  return (
    <div className="flex flex-col mx-auto px-4 max-w-4xl py-8">
      <RegisterAiKnowledge
        id="current-view"
        description="The current view inside my app"
        value="Another app"
      />
      Another part of the app
    </div>
  );
}

function BothApps() {
  return (
    <>
      <TodoApp />
      <AnotherApp />
      <RegisterAiKnowledge
        id="current-view"
        description="The current view inside my app"
        value="Both apps"
      />
    </>
  );
}

export default function Page({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = use(params);
  const [selectedTab, setSelectedTab] = useState(1);
  return (
    <LiveblocksProvider
      authEndpoint="/api/auth/liveblocks"
      // @ts-expect-error
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
    >
      <main className="h-screen w-full">
        <MyNickName />
        <DarkModeToggle />

        <div className="flex flex-col px-4 max-w-4xl py-8 border-b-1 dark:border-neutral-700">
          <div className="flex gap-4 mx-auto">
            <button
              data-testid="tab-todo-app"
              className={
                selectedTab === 1
                  ? "cursor-pointer font-bold dark:text-neutral-100"
                  : "cursor-pointer dark:text-neutral-300"
              }
              onClick={() => setSelectedTab(1)}
            >
              Todo app
            </button>
            <button
              data-testid="tab-another-app"
              className={
                selectedTab === 2
                  ? "cursor-pointer font-bold dark:text-neutral-100"
                  : "cursor-pointer dark:text-neutral-300"
              }
              onClick={() => setSelectedTab(2)}
            >
              Another app
            </button>
            <button
              data-testid="tab-both"
              className={
                selectedTab === 3
                  ? "cursor-pointer font-bold dark:text-neutral-100"
                  : "cursor-pointer dark:text-neutral-300"
              }
              onClick={() => setSelectedTab(3)}
            >
              Both
            </button>
          </div>

          {selectedTab === 1 ? (
            <TodoApp />
          ) : selectedTab === 2 ? (
            <AnotherApp />
          ) : (
            <BothApps />
          )}
        </div>

        <div className="fixed bottom-8 right-8">
          <Popover.Root>
            <Popover.Trigger
              data-testid="ai-chat-trigger"
              className="inline-flex items-center justify-center rounded-full p-4 shadow-[0_0_0_1px_#0000000a,0_2px_6px_#0000000f,0_8px_26px_#00000014] hover:shadow-[0_0_0_1px_#00000014,0_2px_6px_#00000014,0_8px_26px_#00000014] dark:shadow-[0_0_0_1px_#ffffff0f] dark:hover:shadow-[0_0_0_1px_#ffffff14,0_2px_6px_#ffffff14,0_8px_26px_#ffffff14]"
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
                className="flex flex-col w-[450px] h-[600px] shadow-[0_0_0_1px_#0000000a,0_2px_6px_#0000000f,0_8px_26px_#00000014] dark:shadow-[0_0_0_1px_#ffffff0f] dark:hover:shadow-[0_0_0_1px_#ffffff14,0_2px_6px_#ffffff14,0_8px_26px_#ffffff14] rounded-xl"
              >
                <ClientSideSuspense fallback={null}>
                  <AiChat chatId={chatId} className="rounded-xl" />
                </ClientSideSuspense>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </main>
    </LiveblocksProvider>
  );
}
