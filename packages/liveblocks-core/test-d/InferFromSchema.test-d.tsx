/* eslint-disable */

import type {
  AiOpaqueToolDefinition,
  Awaitable,
  InferFromSchema,
  Json,
  JsonObject,
} from "@liveblocks/core";
import { defineAiTool, kInternal } from "@liveblocks/core";
import type { JSONSchema7 } from "json-schema";
import { expectType } from "tsd";

function infer<const T extends JSONSchema7>(x: T): InferFromSchema<T> {
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
      required: ["name", "age"],
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
      required: ["ids"],
    })
  );
}

{
  defineAiTool()({
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
    },
    execute: async (args) => {
      expectType<{ ids: number[] }>(args);
      return { ok: true };
    },
  });
}

{
  defineAiTool()({
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
  defineAiTool()({
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
  defineAiTool()({
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
  const myTool = defineAiTool()({
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
    expectType<
      (
        args: JsonObject,
        context: { toolName: string; toolCallId: string }
      ) => Awaitable<Json>
    >(myTool.execute);
  } else {
    expectType<undefined>(myTool.execute);
  }
  if (!myTool.render) {
    expectType<undefined>(myTool.render);
  } else {
    const internal = { [kInternal]: { execute: undefined } };
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
          $types={undefined as never}
          {...internal}
        />
        <myTool.render
          status="executing"
          toolName="callMyTool"
          toolCallId="tc_abc123"
          args={{ a: 1 }}
          respond={(payload) => {
            expectType<Json>(payload);
          }}
          $types={undefined as never}
          {...internal}
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
          $types={undefined as never}
          {...internal}
        />
      </>
    );
    console.log(jsx);
  }
}

{
  // This tests that tool definitions will get locally inferred, not overridden
  // by the array's *opaque* type they are getting assigned into!
  const tools: AiOpaqueToolDefinition[] = [
    defineAiTool()({
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

    defineAiTool()({
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

    defineAiTool()({
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

    defineAiTool()({
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
