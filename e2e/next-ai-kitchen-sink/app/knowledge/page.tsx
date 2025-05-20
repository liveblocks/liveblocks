"use client";

import type { JSONSchema4 } from "json-schema";
import {
  ClientSideSuspense,
  LiveblocksProvider,
} from "@liveblocks/react/suspense";
import { ComponentType, useCallback, useEffect, useState } from "react";
import { Popover } from "radix-ui";
import { AiChat } from "@liveblocks/react-ui";
import { RegisterAiKnowledge, useClient } from "@liveblocks/react";
import { kInternal, Relax, Resolve, wait } from "@liveblocks/core";

// ---------------------------------------------------------------------------------------------

type InferFromJSONSchema<T extends JSONSchema4> = T extends {
  type: "object";
  properties: Record<string, JSONSchema4>;
  required: readonly string[];
}
  ? Resolve<
      {
        [K in keyof T["properties"] as K extends string
          ? K extends Extract<K, T["required"][number]>
            ? K
            : never
          : never]: InferFromJSONSchema<T["properties"][K]>;
      } & {
        [K in keyof T["properties"] as K extends string
          ? K extends Extract<K, T["required"][number]>
            ? never
            : K
          : never]?: InferFromJSONSchema<T["properties"][K]>;
      }
    >
  : T extends {
        type: "object";
        properties: Record<string, JSONSchema4>;
      }
    ? {
        [K in keyof T["properties"]]?: InferFromJSONSchema<T["properties"][K]>;
      }
    : T extends { type: "string" }
      ? string
      : T extends { type: "number" }
        ? number
        : T extends { type: "boolean" }
          ? boolean
          : T extends { type: "null" }
            ? null
            : T extends { type: "array"; items: JSONSchema4 }
              ? InferFromJSONSchema<T["items"]>[]
              : unknown;

// ---------------------------------------------------------------------------------------------

export type Person = InferFromJSONSchema<{
  type: "object";
  properties: {
    name: { type: "string" };
    age: { type: "number" };
    hobbies: {
      type: "array";
      items: { type: "string" };
    };
  };
  required: ["name", "age"];
}>;

// ---------------------------------------------------------------------------------------------

type MakeAiToolOptions<S extends JSONSchema4, R> = {
  toolName: string;
  description: string;
  parameters: S;
  execute: (options: { args: InferFromJSONSchema<S> }) => Promise<R>;
  // execute?: () => Awaitable<void>;
  render?: ComponentType<
    Relax<
      | { status: "streaming"; result: Partial<R> }
      | { status: "resolved"; result: R; respond: () => void }
      | { status: "error" }
    >
  >;
};

function makeAiTool<S extends JSONSchema4, R>(
  _options: MakeAiToolOptions<S, R>
) {
  return 42 as any;
}

//
// TODO: Implement similarly:
// <RegisterAiTool />
//
// XXX Maybe split these tools into multiple components?
// <RegisterAiChatWidget render={} />
// <RegisterAiChatImmediateSideEffect execute={} ... />
// <RegisterAiChatConfirmableSideEffect previewRender={show date picker} confirmedRender={"okay, I picked this date"} deniedRender={"okay, i'll leave you alone"} />
//
// <RegisterAiTool
// render={({ toolCallId, toolName, args, status }) => {
//    status // "pending" | "confirmed" | "denied"
// />
//
// XXX Move this component into `@liveblocks/react-ui` eventually when done iterating on it
// function RegisterAiTool(_props: any) {
//   // useRegisterAiKnowledge(props);
//   // XXX TODO Implement registering the provided tool
//   return null;
// }

// export function Foo() {
//   const [selectedTool, setSelectedTool] = useState<string | null>("circle");
//
//   return selectedTool === "circle" ? (
//     <>
//       <RegisterTool key="resizeCircle" description="Available circle tools" />
//       <RegisterTool key="changeColor" render={(args) => ...} />
//     </>
//   ) : (
//     <>
//       <RegisterTool key="changeColor" />
//     </>
//   );
// }

function DarkModeToggle(_props: { x?: number }) {
  const [mode, setMode] = useState<"light" | "dark">("light");

  const toggleDarkMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode]);

  return (
    <div className="flex flex-col mx-auto px-4 max-w-4xl py-8 border-b-1">
      <RegisterAiKnowledge
        description="The current mode of the app"
        value={mode}
      />

      {/* <RegisterAiTool */}
      {/*   toolName="toggleDarkMode" */}
      {/*   description="Toggle dark mode" */}
      {/*   parameters={{}} */}
      {/*   render={({ toolCallId, toolName, args }) => { */}
      {/*     toggleDarkMode(); */}
      {/*     return <h1>...</h1>; */}
      {/*   }} */}
      {/* /> */}

      <label>
        <input
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
      <div className="flex flex-col mx-auto px-4 max-w-4xl py-8 border-b-1">
        <label>
          <input type="checkbox" checked={enabled} onChange={() => toggle()} />
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

      {/* <RegisterAiTool */}
      {/*   toolName="displayTodo" */}
      {/*   description="Display todos" */}
      {/*   parameters={{ */}
      {/*     type: "object", */}
      {/*     properties: { */}
      {/*       ids: { */}
      {/*         type: "array", */}
      {/*         description: "The ids of the todo to display", */}
      {/*         items: { */}
      {/*           type: "number", */}
      {/*         }, */}
      {/*       }, */}
      {/*     }, */}
      {/*   }} */}
      {/*   render={({ args }: { args: { ids: number[] } }) => { */}
      {/*     return ( */}
      {/*       <div className="flex flex-col gap-2 shadow-[0_0_0_1px_#0000000a,0_2px_6px_#0000000f,0_8px_26px_#00000014] dark:shadow-[0_0_0_1px_#ffffff0f] rounded-lg p-4 mt-4"> */}
      {/*         {args.ids.map((id) => { */}
      {/*           const todo = todos.find((t) => t.id === id); */}
      {/*           if (!todo) return null; */}
      {/**/}
      {/*           return <div key={todo.id}>{todo.title}</div>; */}
      {/*         })} */}
      {/*       </div> */}
      {/*     ); */}
      {/*   }} */}
      {/* /> */}

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
        className="shadow-[0_0_0_1px_rgb(0_0_0_/_4%),_0_2px_6px_rgb(0_0_0_/_4%),_0_8px_26px_rgb(0_0_0_/_6%)] rounded-lg p-3 w-full border-0 mb-4"
      />

      {todos.length > 0 && (
        <ul className="flex flex-col gap-4">
          {todos.map((todo, index) => {
            return (
              <li
                key={index}
                className={`flex space-between items-center ${todo.isCompleted ? "line-through opacity-50" : "opacity-100"}`}
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

function Debug() {
  const knowledge = useClient()[kInternal].ai.debug_getAllKnowledge();

  const [_, setX] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setX((x) => x + 1);
    }, 200);
    return () => {
      clearInterval(interval);
    };
  }, []);

  return <pre>{JSON.stringify(knowledge, null, 2)}</pre>;
}

export default function Page() {
  const [selectedTab, setSelectedTab] = useState(1);

  //
  // XXX Maybe split these tools into multiple components?
  //
  // "Weather widget" (today's weather)
  // <RegisterAiChatWidget render={} />
  //
  // "Dark mode" (immediate)
  // <RegisterAiChatImmediateSideEffect handler={} ... />
  //      -->  respond('ok')
  //      -->  respond('I set it to dark mode for you!')
  //
  // "HITL" (confirmable)
  // <RegisterAiChatConfirmableSideEffect previewRender={show date picker} confirmedRender={"okay, I picked this date"} deniedRender={"okay, i'll leave you alone"} />
  //
  //
  // Possible states:
  //
  // - "streaming"  (reserved for future use) The AI is streaming in the tool call to the client. We do not use this yet.
  // - "executing"  The AI has finished making the tool call and is now
  //      |         awaiting the response, which should be provided by the
  //      |         client. This phase is up to the user to implement.
  //      |         Example: AI has described in an assistant message:
  //      |            { type: "tool-call", toolName: "getWeather", args: { city: "Paris" }, toolId: "xyz" }
  //      |
  //      |
  //    respond(payload)
  //      |
  //      v
  // - "resolved"   The tool call has finished and has a result (= the payload). This is the tool-result.
  //                Example: We have to respond with { type: "tool-result", toolId: "xyz", data: payload } ("tool" message)
  //
  //                In the backend:
  //                1. Adds a "tool" message to the chat messages with the tool result
  //                2. Ask AI again? (This is multi-step tool calling!)
  //                3. AI responds with an assistant message, and we stream that to both clients!
  //

  // const darkModeToggle = makeAiTool({
  //   toolName: "darkModeToggle",
  //   description: "Toggle the dark mode",
  //   parameters: {},
  //
  //   // = what copilotkit calls handler????
  //   execute: async ({ args /* toolId? */ }) => {
  //     setDarkMode((x) => !x);
  //     return "ok";
  //   },
  // });

  // const sendInvoice = makeAiTool({
  //   toolName: "sendInvoice",
  //   description: "Send an invoice",
  //   parameters: {
  //     type: "object",
  //     properties: {
  //       invoiceId: { type: "string" },
  //       customerName: { type: "string" },
  //       amount: { type: "number" },
  //     },
  //     required: ["invoiceId", "customerName", "amount"],
  //   },

  //   // = what copilotkit calls handler????
  //   execute: async ({ args /* toolId? */ }) => {
  //     return "ok";
  //   },
  //
  //   render: ({ status, args, respond }) => {
  //     // Do send the mail + respond('sent the invoice')
  //     return <button onClick={() => respond("ok")}>Send it!</button>;
  //   },
  // });

  const getWeather = makeAiTool({
    toolName: "getWeather",
    description: "Displays the weather in a widget",
    parameters: {
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    },

    // = what copilotkit calls handler????
    execute: async ({ args /* toolId? */ }) => {
      // During this entire call status === "executing"

      // await callToWeatherService(...)
      await wait(1000);
      return {
        city: args.city,
        days: [
          { date: "2025-05-11", temperature: 20, summary: "Sunny" },
          { date: "2025-05-12", temperature: 22, summary: "Sunny" },
          { date: "2025-05-13", temperature: 21, summary: "Partially cloudy" },
          { date: "2025-05-14", temperature: 23, summary: "Sunny" },
          { date: "2025-05-15", temperature: 25, summary: "Sunny" },
          { date: "2025-05-16", temperature: 24, summary: "Sunny" },
          { date: "2025-05-17", temperature: 23, summary: "Sunny" },
        ],
      };
    },

    //render: ({ status }) => status,

    // render: ({ status, result, respond }) => {
    //   if (status === "streaming") {
    //     return <div>Loading...</div>;
    //   } else if (status === "error") {
    //     return <div>An error happened</div>;
    //   } else {
    //     return (
    //       <div>
    //         <h1>Weather in {result.city}</h1>
    //         {result.days.map((day) => (
    //           <div key={day.date}>
    //             <div>{new Date(day.date).getDay()}</div>
    //             <div>
    //               {day.summary}, {day.temperature}°C
    //             </div>
    //           </div>
    //         ))}
    //       </div>
    //     );
    //   }
    // },
  });

  return (
    <LiveblocksProvider
      authEndpoint="/api/auth/liveblocks"
      // @ts-expect-error
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL}
    >
      <main className="h-screen w-full">
        <MyNickName />
        <DarkModeToggle />

        <div className="flex flex-col px-4 max-w-4xl py-8 border-b-1">
          <div className="flex gap-4 mx-auto">
            <button
              className={
                selectedTab === 1
                  ? "cursor-pointer font-bold"
                  : "cursor-pointer"
              }
              onClick={() => setSelectedTab(1)}
            >
              Todo app
            </button>
            <button
              className={
                selectedTab === 2
                  ? "cursor-pointer font-bold"
                  : "cursor-pointer"
              }
              onClick={() => setSelectedTab(2)}
            >
              Another app
            </button>
            <button
              className={
                selectedTab === 3
                  ? "cursor-pointer font-bold"
                  : "cursor-pointer"
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

        <Debug />

        <div className="fixed bottom-8 right-8">
          <Popover.Root>
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
                className="flex flex-col w-[450px] h-[600px] shadow-[0_0_0_1px_#0000000a,0_2px_6px_#0000000f,0_8px_26px_#00000014] dark:shadow-[0_0_0_1px_#ffffff0f] dark:hover:shadow-[0_0_0_1px_#ffffff14,0_2px_6px_#ffffff14,0_8px_26px_#ffffff14] rounded-xl"
              >
                <ClientSideSuspense fallback={null}>
                  <AiChat
                    chatId="todo125"
                    className="rounded-xl"
                    tools={{
                      getWeather,
                    }}
                  />
                </ClientSideSuspense>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </main>
    </LiveblocksProvider>
  );
}
