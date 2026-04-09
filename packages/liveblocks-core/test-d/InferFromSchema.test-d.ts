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
import { describe, expectTypeOf, test } from "vitest";

function infer<const T extends JSONSchema7>(x: T): InferFromSchema<T> {
  return x as any;
}

describe("InferFromSchema", () => {
  test("should infer object types with required and optional properties", () => {
    expectTypeOf(
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
    ).toEqualTypeOf<{
      name: string;
      age: number;
      hobbies?: string[];
    }>();

    expectTypeOf(
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
    ).toEqualTypeOf<{
      ids: number[];
    }>();
  });

  test("should infer oneOf (XOR) as a union", () => {
    expectTypeOf(
      infer({
        oneOf: [{ type: "string" }, { type: "number" }],
      })
    ).toEqualTypeOf<string | number>();

    expectTypeOf(
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
    ).toEqualTypeOf<{ name: string } | { age: number }>();

    expectTypeOf(
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
    ).toEqualTypeOf<"success" | "error" | { code: number }>();

    expectTypeOf(
      infer({
        type: "array",
        items: {
          oneOf: [{ type: "number" }, { type: "null" }],
        },
      })
    ).toEqualTypeOf<(number | null)[]>();

    // Arrays without a subschema
    expectTypeOf(infer({ type: "array" })).toEqualTypeOf<Json[]>();
  });

  test("should infer anyOf (OR) as a union", () => {
    expectTypeOf(
      infer({
        anyOf: [{ type: "string" }, { type: "number" }],
      })
    ).toEqualTypeOf<string | number>();

    expectTypeOf(
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
    ).toEqualTypeOf<{ name: string } | { age: number }>();

    expectTypeOf(
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
    ).toEqualTypeOf<"pending" | "approved" | { details: string }>();
  });

  test("should infer allOf (AND) as an intersection", () => {
    expectTypeOf(
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
    ).toEqualTypeOf<{ name: string } & { age: number }>();

    expectTypeOf(
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
    ).toEqualTypeOf<
      { id: number } & { title: string } & { completed: boolean }
    >();
  });

  test("should infer not as JSON (no meaningful narrowing)", () => {
    expectTypeOf(infer({ not: { type: "string" } })).toEqualTypeOf<Json>();
    expectTypeOf(
      infer({ not: { const: "forbidden-value" } })
    ).toEqualTypeOf<Json>();
    expectTypeOf(
      infer({
        not: {
          type: "object",
          properties: { name: { type: "string" } },
          required: ["name"],
          additionalProperties: false,
        },
      })
    ).toEqualTypeOf<Json>();
  });

  test("should infer enum types as literal unions", () => {
    expectTypeOf(
      infer({
        enum: ["active", "inactive", null],
      })
    ).toEqualTypeOf<"active" | "inactive" | null>();

    expectTypeOf(
      infer({
        type: "object",
        properties: {
          mode: { type: "string", enum: ["dark", "light"] },
          favNumber: { type: "number", enum: [3, 7, 13, 42] },
        },
        required: ["mode", "favNumber"],
        additionalProperties: false,
      })
    ).toEqualTypeOf<{
      mode: "dark" | "light";
      favNumber: 3 | 7 | 13 | 42;
    }>();
  });

  test("should infer const values as literal types", () => {
    expectTypeOf(
      infer({ const: "exactly-this-value" })
    ).toEqualTypeOf<"exactly-this-value">();
    expectTypeOf(infer({ const: 42 })).toEqualTypeOf<42>();
    expectTypeOf(infer({ const: null })).toEqualTypeOf<null>();
    expectTypeOf(infer({ const: true })).toEqualTypeOf<true>();
  });

  test("should infer string constraints as string", () => {
    expectTypeOf(
      infer({ type: "string", pattern: "^[a-zA-Z0-9]+$" })
    ).toEqualTypeOf<string>();
    expectTypeOf(
      infer({ type: "string", minLength: 5, maxLength: 20 })
    ).toEqualTypeOf<string>();
    expectTypeOf(
      infer({ type: "string", format: "email" })
    ).toEqualTypeOf<string>();
    expectTypeOf(
      infer({ type: "string", format: "uri" })
    ).toEqualTypeOf<string>();
    expectTypeOf(
      infer({ type: "string", format: "uuid" })
    ).toEqualTypeOf<string>();
    expectTypeOf(
      infer({ type: "string", format: "date" })
    ).toEqualTypeOf<string>();
    expectTypeOf(
      infer({ type: "string", format: "date-time" })
    ).toEqualTypeOf<string>();
    expectTypeOf(
      infer({ type: "string", format: "ipv4" })
    ).toEqualTypeOf<string>();
    expectTypeOf(
      infer({ type: "string", format: "ipv6" })
    ).toEqualTypeOf<string>();
    expectTypeOf(
      infer({
        type: "string",
        pattern: "^[A-Z][a-z]+$",
        minLength: 2,
        maxLength: 50,
        format: "hostname",
      })
    ).toEqualTypeOf<string>();
    expectTypeOf(
      infer({ type: "string", format: "custom-format" })
    ).toEqualTypeOf<string>();
    expectTypeOf(
      infer({
        type: "string",
        description: "A descriptive string field",
        pattern: ".*",
      })
    ).toEqualTypeOf<string>();
  });

  test("should infer number/integer constraints as number", () => {
    expectTypeOf(infer({ type: "number", minimum: 0 })).toEqualTypeOf<number>();
    expectTypeOf(
      infer({ type: "number", maximum: 100 })
    ).toEqualTypeOf<number>();
    expectTypeOf(
      infer({ type: "number", minimum: 0, maximum: 100 })
    ).toEqualTypeOf<number>();
    expectTypeOf(
      infer({ type: "number", exclusiveMinimum: 0 })
    ).toEqualTypeOf<number>();
    expectTypeOf(
      infer({ type: "number", exclusiveMaximum: 100 })
    ).toEqualTypeOf<number>();
    expectTypeOf(
      infer({ type: "number", multipleOf: 5 })
    ).toEqualTypeOf<number>();
    expectTypeOf(
      infer({
        type: "number",
        minimum: 1,
        maximum: 1000,
        multipleOf: 10,
        description: "A constrained number",
      })
    ).toEqualTypeOf<number>();

    expectTypeOf(infer({ type: "integer" })).toEqualTypeOf<number>();
    expectTypeOf(
      infer({ type: "integer", minimum: 1, maximum: 10 })
    ).toEqualTypeOf<number>();
    expectTypeOf(
      infer({ type: "integer", multipleOf: 2 })
    ).toEqualTypeOf<number>();
  });

  test("should infer boolean constraints as boolean", () => {
    expectTypeOf(infer({ type: "boolean" })).toEqualTypeOf<boolean>();
    expectTypeOf(
      infer({
        type: "boolean",
        description: "A boolean flag",
        title: "Enable feature",
      })
    ).toEqualTypeOf<boolean>();
    expectTypeOf(
      infer({ type: "boolean", default: true })
    ).toEqualTypeOf<boolean>();
  });

  test("should infer array constraints as T[]", () => {
    expectTypeOf(
      infer({ type: "array", items: { type: "string" }, minItems: 1 })
    ).toEqualTypeOf<string[]>();
    expectTypeOf(
      infer({ type: "array", items: { type: "number" }, maxItems: 10 })
    ).toEqualTypeOf<number[]>();
    expectTypeOf(
      infer({
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 5,
      })
    ).toEqualTypeOf<string[]>();
    expectTypeOf(
      infer({ type: "array", items: { type: "boolean" }, uniqueItems: true })
    ).toEqualTypeOf<boolean[]>();
    expectTypeOf(
      infer({
        type: "array",
        items: { oneOf: [{ type: "string" }, { type: "number" }] },
        minItems: 0,
        maxItems: 100,
        uniqueItems: false,
        description: "Mixed type array with constraints",
      })
    ).toEqualTypeOf<(string | number)[]>();
  });

  test("should infer additionalProperties variants correctly", () => {
    // No additionalProperties (defaults to true)
    expectTypeOf(
      infer({
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      })
    ).toEqualTypeOf<{
      name: string;
      [extra: string]: Json | undefined;
    }>();
    expectTypeOf(
      infer({
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
        additionalProperties: true,
      })
    ).toEqualTypeOf<{
      name: string;
      [extra: string]: Json | undefined;
    }>();

    // When additionalProperties: false
    expectTypeOf(
      infer({
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
        additionalProperties: false,
      })
    ).toEqualTypeOf<{
      name: string;
    }>();

    // "Empty" object variations
    expectTypeOf(infer({ type: "object" })).toEqualTypeOf<{
      [extra: string]: Json | undefined;
    }>();
    expectTypeOf(
      infer({ type: "object", additionalProperties: undefined })
    ).toEqualTypeOf<{ [extra: string]: Json | undefined }>();
    expectTypeOf(
      infer({ type: "object", additionalProperties: true })
    ).toEqualTypeOf<{ [extra: string]: Json | undefined }>();
    // TODO: Make this Record<string, never> again later?
    expectTypeOf(
      infer({ type: "object", additionalProperties: false })
    ).toEqualTypeOf<{}>();

    // When additionalProperties with custom schema
    expectTypeOf(
      infer({
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
        additionalProperties: {
          oneOf: [{ type: "string" }, { type: "boolean" }, { type: "number" }],
        },
      })
    ).toEqualTypeOf<{
      name: string;
      [extra: string]: string | number | boolean | undefined;
    }>();

    // Nested additionalProperties with complex schema
    expectTypeOf(
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
    ).toEqualTypeOf<{
      [extra: string]: { id: number; label: string } | undefined;
    }>();
  });
});

describe("defineAiTool", () => {
  test("should infer args type from parameters schema", () => {
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
        expectTypeOf(args).toEqualTypeOf<{ ids: number[] }>();
        return { data: { ok: true } };
      },
    });

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
        expectTypeOf(args).toEqualTypeOf<{ titles: string[] }>();
        return { data: { ok: true } };
      },
    });

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
        expectTypeOf(args).toEqualTypeOf<{ id?: number }>();
        return { data: { ok: true } };
      },
      render: () => null,
    });
  });

  test("should narrow args/partialArgs in render callback based on stage", () => {
    defineAiTool()({
      description: "Toggle a todo's completion status",
      parameters: {
        type: "object",
        properties: { id: { type: "number" } },
        required: ["id"],
        additionalProperties: false,
      },
      execute: (args) => {
        expectTypeOf(args).toEqualTypeOf<{ id: number }>();
        return { data: { ok: true } };
      },
      render: ({ args, partialArgs }) => {
        if (partialArgs !== undefined) {
          expectTypeOf(args).toEqualTypeOf<undefined>();
        } else {
          expectTypeOf(args).toEqualTypeOf<{ id: number }>();
        }
        return null;
      },
    });
  });

  test("should produce an opaque tool definition", () => {
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
        expectTypeOf(args).toEqualTypeOf<{ foo?: number }>();
        return { data: { ok: true } };
      },
    });

    expectTypeOf(myTool.description).toEqualTypeOf<string | undefined>();
    if (myTool.execute) {
      expectTypeOf(myTool.execute).toEqualTypeOf<
        (
          args: JsonObject,
          context: { name: string; invocationId: string }
        ) => Awaitable<ToolResultResponse | undefined | void>
      >();
    } else {
      expectTypeOf(myTool.execute).toEqualTypeOf<undefined>();
    }
    if (!myTool.render) {
      expectTypeOf(myTool.render).toEqualTypeOf<undefined>();
    } else {
      const internal = {
        [kInternal]: {
          execute: undefined,
          messageStatus: "generating" as const,
        },
      };

      // Possible JSX rendering invocation 1
      myTool.render({
        stage: "receiving",
        name: "callMyTool",
        invocationId: "tc_abc123",
        partialArgs: {},
        respond: (payload) => {
          expectTypeOf(payload).toEqualTypeOf<ToolResultResponse | undefined>();
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
          expectTypeOf(payload).toEqualTypeOf<ToolResultResponse | undefined>();
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
          expectTypeOf(payload).toEqualTypeOf<ToolResultResponse | undefined>();
        },
        types: undefined as never,
        ...internal,
      });
    }
  });

  test("should preserve locally-inferred types when assigned into AiOpaqueToolDefinition[]", () => {
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
          expectTypeOf(args).toEqualTypeOf<{ foo?: number }>();
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
          expectTypeOf(args).toEqualTypeOf<{ bar?: string }>();
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
          expectTypeOf(args).toEqualTypeOf<{ bar?: string }>();
          return { data: { ok: true } };
        },
        render: ({ stage, partialArgs, args, result, respond }) => {
          expectTypeOf(respond).toEqualTypeOf<
            (payload?: ToolResultResponse) => void
          >();

          expectTypeOf(stage).toEqualTypeOf<
            "receiving" | "executing" | "executed"
          >();
          if (stage === "receiving") {
            expectTypeOf(partialArgs).toEqualTypeOf<JsonObject>();
            expectTypeOf(args).toEqualTypeOf<undefined>();
            expectTypeOf(result).toEqualTypeOf<undefined>();
          } else if (stage === "executing") {
            expectTypeOf(partialArgs).toEqualTypeOf<undefined>();
            expectTypeOf(args).toEqualTypeOf<{ bar?: string }>();
            expectTypeOf(result).toEqualTypeOf<undefined>();
          } else {
            expectTypeOf(partialArgs).toEqualTypeOf<undefined>();
            expectTypeOf(args).toEqualTypeOf<{ bar?: string }>();
            expectTypeOf(result).toEqualTypeOf<RenderableToolResultResponse>();
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
          expectTypeOf(respond).toEqualTypeOf<
            (payload?: ToolResultResponse) => void
          >();

          expectTypeOf(stage).toEqualTypeOf<
            "receiving" | "executing" | "executed"
          >();
          if (stage === "receiving") {
            expectTypeOf(partialArgs).toEqualTypeOf<JsonObject>();
            expectTypeOf(args).toEqualTypeOf<undefined>();
            expectTypeOf(result).toEqualTypeOf<undefined>();
          } else if (stage === "executing") {
            expectTypeOf(partialArgs).toEqualTypeOf<undefined>();
            expectTypeOf(args).toEqualTypeOf<{ bar?: string }>();
            expectTypeOf(result).toEqualTypeOf<undefined>();
          } else {
            expectTypeOf(partialArgs).toEqualTypeOf<undefined>();
            expectTypeOf(args).toEqualTypeOf<{ bar?: string }>();
            expectTypeOf(result).toEqualTypeOf<RenderableToolResultResponse>();
          }
          return null;
        },
      }),
    ];
  });

  test("should allow returning undefined when no explicit return type is given", () => {
    defineAiTool()({
      parameters: { type: "object" },
      render: ({ respond }) => {
        expectTypeOf(respond).toEqualTypeOf<
          (payload?: ToolResultResponse) => void
        >();
        respond();
        return null;
      },
    });

    // Same for execute!
    defineAiTool()({
      parameters: { type: "object" },
      execute: () => {},
    });
  });

  test("should enforce non-void return when an explicit return type is given", () => {
    defineAiTool<{ foo: string }>()({
      parameters: { type: "object" },
      // @ts-expect-error - `execute` cannot be empty, it _must_ return `{ foo: string }`
      execute: () => {},
    });

    defineAiTool<{ foo: string }>()({
      parameters: { type: "object" },
      render: ({ respond }) => {
        expectTypeOf(respond).toEqualTypeOf<
          (payload: ToolResultResponse<{ foo: string }>) => void
        >();
        // @ts-expect-error - missing `{ foo: string }` in `respond()`, so an error
        respond();
        return null;
      },
    });
  });

  test("should allow returning undefined when all fields in the explicit return type are optional", () => {
    defineAiTool<{ foo?: string }>()({
      parameters: { type: "object" },
      execute: () => {
        /* it's fine to return nothing */
      },
    });

    defineAiTool<{ foo?: string }>()({
      parameters: { type: "object" },
      render: ({ respond }) => {
        expectTypeOf(respond).toEqualTypeOf<
          (payload?: ToolResultResponse<{ foo?: string }>) => void
        >();
        respond();
        return null;
      },
    });
  });
});
