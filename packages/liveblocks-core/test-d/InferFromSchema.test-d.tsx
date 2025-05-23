import type { InferFromSchema } from "@liveblocks/core";
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
