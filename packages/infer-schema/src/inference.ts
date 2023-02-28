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
import type { InferredSchema } from "./schema";
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
  schema?: InferredSchema;
};

export function mergeInferredTypes(
  a: InferredType,
  b: InferredType,
  ctx: MergeContext
): InferredType | undefined {
  const mergeFn = ctx.mergeFns.get(a)?.get(b) ?? ctx.mergeFns.get(b)?.get(a);
  if (mergeFn) {
    return mergeFn();
  }

  if (isInferredScalarType(a) && isInferredScalarType(b)) {
    return mergeInferredScalarTypes(a, b);
  }

  if (isInferredObjectType(a) && isInferredObjectType(b)) {
    const mergeFn = once(() => mergeInferredObjectTypes(a, b, ctx));
    const currentMergeFns = ctx.mergeFns.get(a) ?? new Map();
    currentMergeFns.set(b, mergeFn);
    ctx.mergeFns.set(a, currentMergeFns);
    return mergeFn();
  }

  // TODO: Add missing types
  return undefined;
}
