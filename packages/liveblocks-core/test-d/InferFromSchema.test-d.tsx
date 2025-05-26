/* eslint-disable */

import type {
  AiToolDefinitionnn,
  Awaitable,
  InferFromSchema,
  Json,
  JsonObject,
} from "@liveblocks/core";
import { tool } from "@liveblocks/core";
import type { JSONSchema4 } from "json-schema";
import { expectType } from "tsd";

function infer<T extends JSONSchema4>(x: T): InferFromSchema<T> {
  return x as any;
}

{
  expectType<{
    name: string;
    age: number;
    hobbies?: string[];
  }>(
    infer({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
        hobbies: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["name", "age"] as const,
      //                        ^^^^^^^^ This is super annoying :(
    })
  );
}

{
  expectType<{
    ids: number[];
  }>(
    infer({
      type: "object",
      properties: {
        ids: {
          type: "array",
          description: "The requested todo items to list",
          items: { type: "number" },
        },
      },
      required: ["ids"] as const,
    })
  );
}

{
  tool()({
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
      required: ["ids"] as const,
    },
    execute: async (args) => {
      expectType<{ ids: number[] }>(args);
      return { ok: true };
    },
  });
}

{
  tool()({
    description: "Add a new todo item to the list",
    parameters: {
      type: "object",
      properties: {
        titles: {
          type: "array",
          description: "The titles of the new items to add to the list",
          items: { type: "string" },
        },
      },
      required: ["titles"],
    },
    execute: (args) => {
      expectType<{ titles: string[] }>(args);
      return { ok: true };
    },
  });
}

{
  tool()({
    description: "Toggle a todo's completion status",
    parameters: {
      type: "object",
      properties: {
        id: {
          description: "The id of the todo to toggle",
          type: "number",
        },
      },
      // required: ["id"],
    },
    execute: (args) => {
      expectType<{ id?: number }>(args);
      return { ok: true };
    },
    render: () => <h1>JSX</h1>,
  });
}

{
  tool()({
    description: "Toggle a todo's completion status",
    parameters: {
      type: "object",
      properties: { id: { type: "number" } },
      required: ["id"],
    },
    execute: (args) => {
      expectType<{ id: number }>(args);
      return { ok: true };
    },
    render: ({ args, partialArgs }) => {
      if (partialArgs !== undefined) {
        expectType<undefined>(args);
      } else {
        expectType<{ id: number }>(args);
      }
      return null;
    },
  });
}

{
  // Resulting tool definition is opaque
  const myTool = tool()({
    description: "First tool",
    parameters: {
      type: "object",
      properties: {
        foo: { type: "number" },
      },
    },
    execute: (args) => {
      expectType<{ foo?: number }>(args);
      return { ok: true };
    },
  });

  expectType<string | undefined>(myTool.description);
  if (myTool.execute) {
    expectType<(args: JsonObject) => Awaitable<Json>>(myTool.execute);
  } else {
    expectType<undefined>(myTool.execute);
  }
  if (!myTool.render) {
    expectType<undefined>(myTool.render);
  } else {
    const jsx = (
      <>
        {/* Test three different invocations */}
        <myTool.render
          status="receiving"
          toolName="callMyTool"
          toolCallId="tc_abc123"
          partialArgs={{}}
          respond={(payload) => {
            expectType<Json>(payload);
          }}
        />
        <myTool.render
          status="executing"
          toolName="callMyTool"
          toolCallId="tc_abc123"
          args={{ a: 1 }}
          respond={(payload) => {
            expectType<Json>(payload);
          }}
        />
        <myTool.render
          status="executed"
          toolName="callMyTool"
          toolCallId="tc_abc123"
          args={{ a: 1 }}
          result={{ b: 2 }}
          respond={(payload) => {
            expectType<Json>(payload);
          }}
        />
      </>
    );
    console.log(jsx);
  }
}

{
  // This tests that tool definitions will get locally inferred, not overridden
  // by the array's *opaque* type they are getting assigned into!
  const tools: AiToolDefinitionnn[] = [
    tool()({
      description: "First tool (execute, no render)",
      parameters: {
        type: "object",
        properties: { foo: { type: "number" } },
      },
      execute: (args) => {
        expectType<{ foo?: number }>(args);
        return { ok: true };
      },
    }),

    tool()({
      description: "Second tool (execute, no render)",
      parameters: {
        type: "object",
        properties: { bar: { type: "string" } },
      },
      execute: (args) => {
        expectType<{ bar?: string }>(args);
        return { ok: true };
      },
    }),

    tool()({
      description: "Third tool (execute & render)",
      parameters: {
        type: "object",
        properties: { bar: { type: "string" } },
      },
      execute: (args) => {
        expectType<{ bar?: string }>(args);
        return { ok: true };
      },
      render: ({ status, partialArgs, args, result, respond }) => {
        expectType<(payload: Json) => void>(respond);

        expectType<"receiving" | "executing" | "executed">(status);
        if (status === "receiving") {
          expectType<Json>(partialArgs);
          expectType<undefined>(args);
          expectType<undefined>(result);
        } else if (status === "executing") {
          expectType<undefined>(partialArgs);
          expectType<{ bar?: string }>(args);
          expectType<undefined>(result);
        } else {
          expectType<undefined>(partialArgs);
          expectType<{ bar?: string }>(args);
          expectType<Json>(result);
        }
        return null;
      },
    }),

    tool()({
      description: "Fourth tool (render, no execute)",
      parameters: {
        type: "object",
        properties: { bar: { type: "string" } },
      },
      render: ({ status, partialArgs, args, result, respond }) => {
        expectType<(payload: Json) => void>(respond);

        expectType<"receiving" | "executing" | "executed">(status);
        if (status === "receiving") {
          expectType<Json>(partialArgs);
          expectType<undefined>(args);
          expectType<undefined>(result);
        } else if (status === "executing") {
          expectType<undefined>(partialArgs);
          expectType<{ bar?: string }>(args);
          expectType<undefined>(result);
        } else {
          expectType<undefined>(partialArgs);
          expectType<{ bar?: string }>(args);
          expectType<Json>(result);
        }
        return null;
      },
    }),
  ];
  console.log(tools); // Just use the tools variable
}
