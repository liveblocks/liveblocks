import { inferLsonFields } from "./fields";
import {
  combineInferredLiveObjectTypes,
  inferLiveObjectType,
  InferredLiveObjectType,
  inferredLiveObjectTypeToAst,
} from "./liveObject";
import {
  inferObjectType,
  InferredObjectType,
  inferredObjectTypeToAst,
} from "./object";
import {
  combineInferredScalarTypes,
  InferredScalarType,
  inferScalarType,
  isInferredScalarType,
} from "./scalar";
import { InferredRootType, InferredSchema } from "./schema";
import { ChildContext, JsonScalar, PlainLson, PlainLsonObject } from "./types";
import { PartialBy } from "./utils/types";

export type InferredType =
  | InferredScalarType
  | InferredLiveObjectType
  | InferredObjectType;

export function isAtomic(type: InferredType): boolean {
  return "atomic" in type && type.atomic;
}

export function inferStorageType(
  value: PlainLsonObject
): InferredLiveObjectType {
  const storage: PartialBy<InferredLiveObjectType, "fields"> = {
    names: new Map([["Storage", 1]]),
    type: "LiveObject",
    atomic: true,
  };

  const fields = inferLsonFields(value.data, {
    json: false,
    parent: storage,
  });
  storage.fields = fields;

  return storage as InferredLiveObjectType;
}

export function inferType(value: PlainLson, ctx: ChildContext): InferredType {
  if (typeof value !== "object" || value === null || value === undefined) {
    return inferScalarType(value as JsonScalar, ctx);
  }

  if (Array.isArray(value)) {
    throw new Error("Not implemented");
  }

  // If we are in a json all objects are plain struct types even if they
  // have a type property
  if (!ctx.json && "liveblocksType" in value) {
    if (value.liveblocksType === "LiveObject") {
      return inferLiveObjectType(value as PlainLsonObject, ctx);
    }

    if (value.liveblocksType === "LiveList") {
      throw new Error("Not implemented");
    }

    if (value.liveblocksType === "LiveMap") {
      throw new Error("Not implemented");
    }
  }

  return inferObjectType(value, ctx);
}

export function combineInferredTypes(
  a: InferredType,
  b: InferredType
): InferredType | undefined {
  if (isInferredScalarType(a) && isInferredScalarType(b)) {
    return combineInferredScalarTypes(a, b);
  }

  if (a.type === "LiveObject" && b.type === "LiveObject") {
    return combineInferredLiveObjectTypes(a, b);
  }

  throw new Error("Not implemented");
}

export function inferredRootTypeToAst(
  value: InferredRootType,
  schema: InferredSchema
) {
  switch (value.type) {
    case "LiveObject":
      return inferredLiveObjectTypeToAst(value, schema);
    case "Object":
      return inferredObjectTypeToAst(value, schema);
  }
}
