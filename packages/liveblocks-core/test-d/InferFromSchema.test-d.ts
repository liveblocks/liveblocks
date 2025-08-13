/* eslint-disable */

import type {
  AiOpaqueToolDefinition,
  Awaitable,
  InferFromSchema,
  Json,
  JsonObject,
  RenderableToolResultResponse,
  ToolResultResponse,
} from "@liveblocks/core";
import { defineAiTool, kInternal } from "@liveblocks/core";
import type { JSONSchema7 } from "json-schema";
import { expectError, expectType } from "tsd";

function infer<const T extends JSONSchema7>(x: T): InferFromSchema<T> {
  return x as any;
}

// Object tests
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
      additionalProperties: false,
    })
  );

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
      additionalProperties: false,
    })
  );
}

// Unions (XOR)
{
  expectType<string | number>(
    infer({
      oneOf: [{ type: "string" }, { type: "number" }],
    })
  );

  expectType<{ name: string } | { age: number }>(
    infer({
      oneOf: [
        {
          type: "object",
          properties: { name: { type: "string" } },
          required: ["name"],
          additionalProperties: false,
        },
        {
          type: "object",
          properties: { age: { type: "number" } },
          required: ["age"],
          additionalProperties: false,
        },
      ],
    })
  );

  expectType<"success" | "error" | { code: number }>(
    infer({
      oneOf: [
        { type: "string", enum: ["success", "error"] },
        {
          type: "object",
          properties: { code: { type: "number" } },
          required: ["code"],
          additionalProperties: false,
        },
      ],
    })
  );

  expectType<(number | null)[]>(
    infer({
      type: "array",
      items: {
        oneOf: [{ type: "number" }, { type: "null" }],
      },
    })
  );

  // Arrays without a subschema
  expectType<Json[]>(infer({ type: "array" }));
}

// Unions (OR)
{
  expectType<string | number>(
    infer({
      anyOf: [{ type: "string" }, { type: "number" }],
    })
  );

  expectType<{ name: string } | { age: number }>(
    infer({
      anyOf: [
        {
          type: "object",
          properties: { name: { type: "string" } },
          required: ["name"],
          additionalProperties: false,
        },
        {
          type: "object",
          properties: { age: { type: "number" } },
          required: ["age"],
          additionalProperties: false,
        },
      ],
    })
  );

  expectType<"pending" | "approved" | { details: string }>(
    infer({
      anyOf: [
        { type: "string", enum: ["pending", "approved"] },
        {
          type: "object",
          properties: { details: { type: "string" } },
          required: ["details"],
          additionalProperties: false,
        },
      ],
    })
  );
}

// Intersections (AND)
{
  expectType<{ name: string } & { age: number }>(
    infer({
      allOf: [
        {
          type: "object",
          properties: { name: { type: "string" } },
          required: ["name"],
          additionalProperties: false,
        },
        {
          type: "object",
          properties: { age: { type: "number" } },
          required: ["age"],
          additionalProperties: false,
        },
      ],
    })
  );

  expectType<{ id: number } & { title: string } & { completed: boolean }>(
    infer({
      allOf: [
        {
          type: "object",
          properties: { id: { type: "number" } },
          required: ["id"],
          additionalProperties: false,
        },
        {
          type: "object",
          properties: { title: { type: "string" } },
          required: ["title"],
          additionalProperties: false,
        },
        {
          type: "object",
          properties: { completed: { type: "boolean" } },
          required: ["completed"],
          additionalProperties: false,
        },
      ],
    })
  );
}

// Not (not super meaningful inference outputs)
{
  expectType<Json>(infer({ not: { type: "string" } }));
  expectType<Json>(infer({ not: { const: "forbidden-value" } }));
  expectType<Json>(
    infer({
      not: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
        additionalProperties: false,
      },
    })
  );
}

// Enums
{
  expectType<"active" | "inactive" | null>(
    infer({
      enum: ["active", "inactive", null],
    })
  );
}

{
  expectType<{
    mode: "dark" | "light";
    favNumber: 3 | 7 | 13 | 42;
  }>(
    infer({
      type: "object",
      properties: {
        mode: { type: "string", enum: ["dark", "light"] },
        favNumber: { type: "number", enum: [3, 7, 13, 42] },
      },
      required: ["mode", "favNumber"],
      additionalProperties: false,
    })
  );
}

// Constants
{
  expectType<"exactly-this-value">(infer({ const: "exactly-this-value" }));
  expectType<42>(infer({ const: 42 }));
  expectType<null>(infer({ const: null }));
  expectType<true>(infer({ const: true }));
}

// Various string validations (these all "just" infer as string)
{
  expectType<string>(infer({ type: "string", pattern: "^[a-zA-Z0-9]+$" }));
  expectType<string>(infer({ type: "string", minLength: 5, maxLength: 20 }));
  expectType<string>(infer({ type: "string", format: "email" }));
  expectType<string>(infer({ type: "string", format: "uri" }));
  expectType<string>(infer({ type: "string", format: "uuid" }));
  expectType<string>(infer({ type: "string", format: "date" }));
  expectType<string>(infer({ type: "string", format: "date-time" }));
  expectType<string>(infer({ type: "string", format: "ipv4" }));
  expectType<string>(infer({ type: "string", format: "ipv6" }));
  expectType<string>(
    infer({
      type: "string",
      pattern: "^[A-Z][a-z]+$",
      minLength: 2,
      maxLength: 50,
      format: "hostname",
    })
  );
  expectType<string>(infer({ type: "string", format: "custom-format" }));
  expectType<string>(
    infer({
      type: "string",
      description: "A descriptive string field",
      pattern: ".*",
    })
  );
}

// Various number validations (these all "just" infer as number)
{
  expectType<number>(infer({ type: "number", minimum: 0 }));
  expectType<number>(infer({ type: "number", maximum: 100 }));
  expectType<number>(infer({ type: "number", minimum: 0, maximum: 100 }));
  expectType<number>(infer({ type: "number", exclusiveMinimum: 0 }));
  expectType<number>(infer({ type: "number", exclusiveMaximum: 100 }));
  expectType<number>(infer({ type: "number", multipleOf: 5 }));
  expectType<number>(
    infer({
      type: "number",
      minimum: 1,
      maximum: 1000,
      multipleOf: 10,
      description: "A constrained number",
    })
  );

  // Integer with constraints
  expectType<number>(infer({ type: "integer" }));
  expectType<number>(infer({ type: "integer", minimum: 1, maximum: 10 }));
  expectType<number>(infer({ type: "integer", multipleOf: 2 }));
}

// Various boolean validations (these all "just" infer as boolean)
{
  expectType<boolean>(infer({ type: "boolean" }));
  expectType<boolean>(
    infer({
      type: "boolean",
      description: "A boolean flag",
      title: "Enable feature",
    })
  );
  expectType<boolean>(infer({ type: "boolean", default: true }));
}

// Various array validations (these all "just" infer as T[])
{
  expectType<string[]>(
    infer({ type: "array", items: { type: "string" }, minItems: 1 })
  );
  expectType<number[]>(
    infer({ type: "array", items: { type: "number" }, maxItems: 10 })
  );
  expectType<string[]>(
    infer({
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 5,
    })
  );
  expectType<boolean[]>(
    infer({ type: "array", items: { type: "boolean" }, uniqueItems: true })
  );
  expectType<(string | number)[]>(
    infer({
      type: "array",
      items: { oneOf: [{ type: "string" }, { type: "number" }] },
      minItems: 0,
      maxItems: 100,
      uniqueItems: false,
      description: "Mixed type array with constraints",
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
      additionalProperties: false,
    },
    execute: async (args) => {
      expectType<{ ids: number[] }>(args);
      return { data: { ok: true } };
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
      additionalProperties: false,
    },
    execute: (args) => {
      expectType<{ titles: string[] }>(args);
      return { data: { ok: true } };
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
      additionalProperties: false,
    },
    execute: (args) => {
      expectType<{ id?: number }>(args);
      return { data: { ok: true } };
    },
    render: () => null,
  });
}

{
  defineAiTool()({
    description: "Toggle a todo's completion status",
    parameters: {
      type: "object",
      properties: { id: { type: "number" } },
      required: ["id"],
      additionalProperties: false,
    },
    execute: (args) => {
      expectType<{ id: number }>(args);
      return { data: { ok: true } };
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
      additionalProperties: false,
    },
    execute: (args) => {
      expectType<{ foo?: number }>(args);
      return { data: { ok: true } };
    },
  });

  expectType<string | undefined>(myTool.description);
  if (myTool.execute) {
    expectType<
      (
        args: JsonObject,
        context: { name: string; invocationId: string }
      ) => Awaitable<ToolResultResponse | undefined | void>
    >(myTool.execute);
  } else {
    expectType<undefined>(myTool.execute);
  }
  if (!myTool.render) {
    expectType<undefined>(myTool.render);
  } else {
    const internal = { [kInternal]: { execute: undefined } };

    // Possible JSX rendering invocation 1
    myTool.render({
      stage: "receiving",
      name: "callMyTool",
      invocationId: "tc_abc123",
      partialArgs: {},
      respond: (payload) => {
        expectType<ToolResultResponse | undefined>(payload);
      },
      types: undefined as never,
      ...internal,
    });

    // Possible JSX rendering invocation 2
    myTool.render({
      stage: "executing",
      name: "callMyTool",
      invocationId: "tc_abc123",
      args: { a: 1 },
      respond: (payload) => {
        expectType<ToolResultResponse | undefined>(payload);
      },
      types: undefined as never,
      ...internal,
    });

    // Possible JSX rendering invocation 3
    myTool.render({
      stage: "executed",
      name: "callMyTool",
      invocationId: "tc_abc123",
      args: { a: 1 },
      result: { type: "success", data: { b: 2 } },
      respond: (payload) => {
        expectType<ToolResultResponse | undefined>(payload);
      },
      types: undefined as never,
      ...internal,
    });
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
        additionalProperties: false,
      },
      execute: (args) => {
        expectType<{ foo?: number }>(args);
        return { data: { ok: true } };
      },
    }),

    defineAiTool()({
      description: "Second tool (execute, no render)",
      parameters: {
        type: "object",
        properties: { bar: { type: "string" } },
        additionalProperties: false,
      },
      execute: (args) => {
        expectType<{ bar?: string }>(args);
        return { data: { ok: true } };
      },
    }),

    defineAiTool()({
      description: "Third tool (execute & render)",
      parameters: {
        type: "object",
        properties: { bar: { type: "string" } },
        additionalProperties: false,
      },
      execute: (args) => {
        expectType<{ bar?: string }>(args);
        return { data: { ok: true } };
      },
      render: ({ stage, partialArgs, args, result, respond }) => {
        expectType<(payload?: ToolResultResponse) => void>(respond);

        expectType<"receiving" | "executing" | "executed">(stage);
        if (stage === "receiving") {
          expectType<JsonObject>(partialArgs);
          expectType<undefined>(args);
          expectType<undefined>(result);
        } else if (stage === "executing") {
          expectType<undefined>(partialArgs);
          expectType<{ bar?: string }>(args);
          expectType<undefined>(result);
        } else {
          expectType<undefined>(partialArgs);
          expectType<{ bar?: string }>(args);
          expectType<RenderableToolResultResponse>(result);
        }
        return null;
      },
    }),

    defineAiTool()({
      description: "Fourth tool (render, no execute)",
      parameters: {
        type: "object",
        properties: { bar: { type: "string" } },
        additionalProperties: false,
      },
      render: ({ stage, partialArgs, args, result, respond }) => {
        expectType<(payload?: ToolResultResponse) => void>(respond);

        expectType<"receiving" | "executing" | "executed">(stage);
        if (stage === "receiving") {
          expectType<JsonObject>(partialArgs);
          expectType<undefined>(args);
          expectType<undefined>(result);
        } else if (stage === "executing") {
          expectType<undefined>(partialArgs);
          expectType<{ bar?: string }>(args);
          expectType<undefined>(result);
        } else {
          expectType<undefined>(partialArgs);
          expectType<{ bar?: string }>(args);
          expectType<RenderableToolResultResponse>(result);
        }
        return null;
      },
    }),
  ];
  console.log(tools); // Just use the tools variable
}

// Objects with additionalProperties field
{
  // No additionalProperties (defaults to true)
  expectType<{
    name: string;
    [extra: string]: Json | undefined;
  }>(
    infer({
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
    })
  );
  expectType<{
    name: string;
    [extra: string]: Json | undefined;
  }>(
    infer({
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
      additionalProperties: true,
    })
  );

  // When additionalProperties: false
  expectType<{
    name: string;
  }>(
    infer({
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
      additionalProperties: false,
    })
  );

  // "Empty" object variations
  expectType<{ [extra: string]: Json | undefined }>(infer({ type: "object" }));
  expectType<{ [extra: string]: Json | undefined }>(
    infer({ type: "object", additionalProperties: undefined })
  );
  expectType<{ [extra: string]: Json | undefined }>(
    infer({ type: "object", additionalProperties: true })
  );
  // TODO Make this Record<string, never> again later?
  expectType<{}>(infer({ type: "object", additionalProperties: false }));

  // When additionalProperties with custom schema
  expectType<{
    name: string;
    [extra: string]: string | number | boolean | undefined;
  }>(
    infer({
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
      additionalProperties: {
        oneOf: [{ type: "string" }, { type: "boolean" }, { type: "number" }],
      },
    })
  );

  // Nested additionalProperties with complex schema
  expectType<{
    [extra: string]: { id: number; label: string } | undefined;
  }>(
    infer({
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          id: { type: "number" },
          label: { type: "string" },
        },
        required: ["id", "label"],
        additionalProperties: false,
      },
    })
  );
}

{
  // No type annotation of result type means `undefined` can be responded with
  defineAiTool()({
    parameters: { type: "object" },
    render: ({ respond }) => {
      expectType<(payload?: ToolResultResponse) => void>(respond);
      respond();
      return null;
    },
  });

  // Same for execute!
  defineAiTool()({
    parameters: { type: "object" },
    execute: () => {},
  });
}

// But the same is no longer true if there is an explicit return type!
{
  expectError(
    defineAiTool<{ foo: string }>()({
      parameters: { type: "object" },
      execute: () => {
        /* cannot be empty, _must_ return `{ foo: string }` */
      },
    })
  );

  defineAiTool<{ foo: string }>()({
    parameters: { type: "object" },
    render: ({ respond }) => {
      expectType<(payload: ToolResultResponse<{ foo: string }>) => void>(
        respond
      );
      expectError(respond(/* missing { foo: string }, so an error */));
      return null;
    },
  });
}

// However, it's fine again if all fields are optional...!
{
  defineAiTool<{ foo?: string }>()({
    parameters: { type: "object" },
    execute: () => {
      /* it's fine to return nothing */
    },
  });

  defineAiTool<{ foo?: string }>()({
    parameters: { type: "object" },
    render: ({ respond }) => {
      expectType<(payload?: ToolResultResponse<{ foo?: string }>) => void>(
        respond
      );
      respond();
      return null;
    },
  });
}
