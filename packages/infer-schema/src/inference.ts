import { inferLsonFields } from "./field";
import type { InferredObjectType } from "./object";
import {
  inferObjectType,
  isInferredObjectType,
  mergeInferredObjectTypes,
} from "./object";
import type { JsonScalar, PlainLson, PlainLsonObject } from "./plainLson";
import type { InferredScalarType } from "./scalar";
import {
  inferScalarType,
  isInferredScalarType,
  mergeInferredScalarTypes,
} from "./scalar";
import { once } from "./utils/once";
import type { PartialBy } from "./utils/types";

type FieldChildContext = {
  parent: PartialBy<InferredObjectType, "fields">;
  field: string;
};

export type ChildContext = FieldChildContext; // TODO: Expand for union, list, ...
export type InferredType = InferredScalarType | InferredObjectType;

export function isAtomic(type: InferredType): boolean {
  return isInferredObjectType(type) && type.atomic;
}

export function inferStorageType(value: PlainLsonObject): InferredObjectType {
  const storage: PartialBy<InferredObjectType, "fields"> = {
    names: { Storage: 1 },
    type: "Object",
    live: true,
    atomic: true,
  };

  const fields = inferLsonFields(value.data, { parent: storage });
  storage.fields = fields;

  return storage as InferredObjectType;
}

export function inferType(value: PlainLson, ctx: ChildContext): InferredType {
  if (typeof value !== "object" || value === null || value === undefined) {
    return inferScalarType(value as JsonScalar, ctx);
  }

  if (Array.isArray(value)) {
    throw new Error("Not implemented");
  }

  if (!("liveblocksType" in value)) {
    return inferObjectType(value, ctx);
  }

  if (value.liveblocksType === "LiveObject") {
    return inferObjectType(value, ctx);
  }

  throw new Error("Not implemented");
}

export type MergeContext = {
  mergeFns: Map<
    InferredType,
    Map<InferredType, () => InferredType | undefined>
  >;
  typeReplacements: Map<InferredType, InferredType>;
};

function currentType(type: InferredType, ctx: MergeContext): InferredType {
  let current = type;
  while (true) {
    const next = ctx.typeReplacements.get(current);
    if (!next) {
      return current;
    }

    current = next;
  }
}

function plainMergeInferredTypes(
  a: InferredType,
  b: InferredType,
  ctx: MergeContext
): InferredType | undefined {
  if (isInferredScalarType(a) && isInferredScalarType(b)) {
    return mergeInferredScalarTypes(a, b);
  }

  if (isInferredObjectType(a) && isInferredObjectType(b)) {
    return mergeInferredObjectTypes(a, b, ctx);
  }

  // TODO: Add missing types
  return undefined;
}

export function mergeInferredTypes(
  a: InferredType,
  b: InferredType,
  ctx: MergeContext
): InferredType | undefined {
  const currentA = currentType(a, ctx);
  const currentB = currentType(b, ctx);

  if (currentA === currentB) {
    return currentA;
  }

  // merge(a, b) = merge(b, a), so we can use both
  const cached =
    ctx.mergeFns.get(currentA)?.get(currentB) ??
    ctx.mergeFns.get(currentB)?.get(currentA);

  if (cached) {
    return cached();
  }

  const merge = once(() => plainMergeInferredTypes(currentA, currentB, ctx));

  const current = ctx.mergeFns.get(currentA) ?? new Map();
  current.set(currentB, merge);
  ctx.mergeFns.set(currentA, current);

  return merge();
}
