import type { JSONSchema7 } from "json-schema";

import type { Json, JsonObject } from "../lib/Json";
import type { Resolve } from "../lib/Resolve";

export type JSONObjectSchema7 = JSONSchema7 & { type: "object" };

// eslint-disable-next-line @typescript-eslint/ban-types
type NoFields = {};

type Infer<T> = T extends JSONSchema7 ? InferFromSchema<T> : never;

type InferAllOf<T extends readonly JSONSchema7[]> = T extends readonly [
  infer U,
  ...infer R,
]
  ? R extends readonly JSONSchema7[]
    ? Infer<U> & InferAllOf<R>
    : Infer<U>
  : unknown; // Empty [] case: (X & unknown <==> X)

type InferRequireds<P, R extends readonly string[]> = {
  -readonly [K in keyof P as K extends string
    ? K extends Extract<K, R[number]>
      ? K
      : never
    : never]: Infer<P[K]>;
};

type InferOptionals<P, R extends readonly string[]> = {
  -readonly [K in keyof P as K extends string
    ? K extends Extract<K, R[number]>
      ? never
      : K
    : never]?: Infer<P[K]>;
};

// prettier-ignore
type InferBaseObject<T extends JSONObjectSchema7> =
  T extends { properties?: infer P extends Record<string, JSONSchema7>;
              required?: infer R; }

  // Required and optional fields
  ? InferRequireds<P, R extends readonly string[] ? R : []> &
    InferOptionals<P, R extends readonly string[] ? R : []>

  : NoFields;

// prettier-ignore
type InferAdditionals<T extends JSONObjectSchema7> =
  T extends { additionalProperties: false } ? NoFields :
  T extends { additionalProperties?: true } ? JsonObject :
  T extends { additionalProperties: infer A } ? { [extra: string]: Infer<A> | undefined } :
  JsonObject;

// prettier-ignore
type InferFromObjectSchema<T extends JSONObjectSchema7> =
  Resolve<InferBaseObject<T> & InferAdditionals<T>>;

// prettier-ignore
type InferFromArraySchema<T extends JSONSchema7> =
  // With subschema
  T extends { items: infer U } ? Infer<U>[] :
  // Without item schema
  Json[];

// prettier-ignore
export type InferFromSchema<T extends JSONSchema7> =
  // Fallback for generic JSONSchema7 type (when no specific schema is provided)
  JSONSchema7 extends T ? JsonObject :

  T extends { type: "object" } ? InferFromObjectSchema<T> :
  T extends { type: "array"; } ? InferFromArraySchema<T> :

  // Unions: oneOf, anyOf combinations (|)
  T extends { oneOf: readonly (infer U)[] } ? Infer<U> :
  T extends { anyOf: readonly (infer U)[] } ? Infer<U> :

  // Intersections: allOf combinations (&)
  T extends { allOf: readonly JSONSchema7[] } ? InferAllOf<T["allOf"]> :

  // Negation is too complex to represent precisely, so falls back to Json
  T extends { not: JSONSchema7 } ? Json :

  // Enums of constants
  T extends { enum: readonly (infer U)[] } ? U :

  // Constants
  T extends { const: infer C } ? C :

  // Primitive types
  T extends { type: "string" } ? string :
  T extends { type: "number" } ? number :
  T extends { type: "integer" } ? number :
  T extends { type: "boolean" } ? boolean :
  T extends { type: "null" } ? null :

  // Fallback for any unhandled schema - allows any Json value
  Json;
