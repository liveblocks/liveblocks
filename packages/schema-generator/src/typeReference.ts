import type { AST } from "@liveblocks/schema";

import { inferType, mergeInferredTypes } from ".";
import { isInferredObjectType } from "./object";
import { inferredScalarTypeToAst, isInferredScalarType } from "./scalar";
import type { InferredSchema } from "./schema";
import type { ChildContext, InferredType, PlainLson } from "./types";
import { invariant } from "./utils/invariant";
import { isNotUndefined } from "./utils/typeGuards";

export type InferredTypeReference = {
  value: InferredType;
  optional: boolean;
};

export function inferTypeReference(
  value: PlainLson,
  ctx: ChildContext
): InferredTypeReference {
  return { value: inferType(value, ctx), optional: false };
}

export function mergeInferredTypeReferences(
  a: InferredTypeReference,
  b: InferredTypeReference
): InferredTypeReference | undefined {
  const mergeValue = mergeInferredTypes(a.value, b.value);
  if (!mergeValue) {
    return undefined;
  }

  return {
    value: mergeValue,
    optional: a.optional || b.optional,
  };
}

export function inferredTypeReferenceToAst(
  { value }: InferredTypeReference,
  schema: InferredSchema
): AST.BuiltInScalar | AST.TypeRef {
  if (isInferredScalarType(value)) {
    return inferredScalarTypeToAst(value, schema);
  }

  if (isInferredObjectType(value)) {
    const name = schema.rootNames.getKey(value);
    invariant(
      isNotUndefined(name),
      "Root type reference without assigned name"
    );

    return {
      _kind: "TypeRef",
      asLiveObject: value.live,
      ref: {
        _kind: "TypeName",
        name,
        range: [0, 0],
      },
      range: [0, 0],
    };
  }

  throw new Error("Not implemented");
}
