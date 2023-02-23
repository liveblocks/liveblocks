import { AST } from "@liveblocks/schema";

import type { ChildContext, InferredType } from "./inference";
import type { ScoredNames } from "./naming";
import { generateNames, mergeScoredNames } from "./naming";
import type { JsonScalar } from "./plainLson";
import type { InferredSchema } from "./schema";

export type InferredStringType = {
  type: "String";
  values: Set<string>;
  names: ScoredNames;
};

export type InferredBooleanType = {
  type: "Boolean";
  values: Set<boolean>;
  names: ScoredNames;
};

export type InferredIntegerType = {
  type: "Integer";
  values: Set<number>;
  names: ScoredNames;
};

export type InferredFloatType = {
  type: "Float";
  values: Set<number>;
  names: ScoredNames;
};

export type InferredScalarType =
  | InferredStringType
  | InferredBooleanType
  | InferredIntegerType
  | InferredFloatType;

export const INFERRED_SCALAR_TYPES: Set<InferredScalarType["type"]> = new Set([
  "String",
  "Boolean",
  "Integer",
  "Float",
]);

export function mergeInferredScalarTypes(
  a: InferredScalarType,
  b: InferredScalarType
): InferredScalarType | undefined {
  if (a.type === b.type) {
    return {
      type: a.type,
      values: new Set([...a.values, ...b.values]),
      names: mergeScoredNames(a.names, b.names),
    } as InferredScalarType;
  }

  // Floats are a superset of integers, so we can merge them
  if (
    (a.type === "Integer" && b.type === "Float") ||
    (a.type === "Float" && b.type === "Integer")
  ) {
    return {
      type: "Float",
      values: new Set([...a.values, ...b.values]),
      names: mergeScoredNames(a.names, b.names),
    };
  }

  return undefined;
}

export function inferScalarType(
  value: JsonScalar,
  ctx: ChildContext
): InferredScalarType {
  switch (typeof value) {
    case "string":
      return {
        type: "String",
        values: new Set([value]),
        names: generateNames(ctx),
      };
    case "boolean":
      return {
        type: "Boolean",
        values: new Set([value]),
        names: generateNames(ctx),
      };
    case "number":
      return {
        type: Number.isInteger(value) ? "Integer" : "Float",
        values: new Set([value]),
        names: generateNames(ctx),
      };
    default:
      throw new Error(`Unexpected scalar type: ${typeof value}`);
  }
}

export function isInferredScalarType(
  value: InferredType
): value is InferredScalarType {
  return INFERRED_SCALAR_TYPES.has(value.type as InferredScalarType["type"]);
}

export function inferredScalarTypeToAst(
  scalar: InferredScalarType,
  _schema: InferredSchema
): AST.BuiltInScalar {
  switch (scalar.type) {
    case "String":
      return AST.stringType();
    case "Boolean":
      return AST.booleanType();
    case "Integer":
      return AST.intType();
    case "Float":
      return AST.floatType();
  }
}
