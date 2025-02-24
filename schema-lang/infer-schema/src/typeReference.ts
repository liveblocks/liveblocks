import type { PlainLson } from "@liveblocks/core";
import { AST } from "@liveblocks/schema";

import type { ChildContext, InferredType, MergeContext } from "./inference.js";
import { inferType, mergeInferredTypes } from "./inference.js";
import { isInferredObjectType } from "./object.js";
import { inferredScalarTypeToAst, isInferredScalarType } from "./scalar.js";
import type { InferredSchema } from "./schema.js";
import { invariant } from "./utils/invariant.js";
import { isNotUndefined } from "./utils/typeGuards.js";

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
  b: InferredTypeReference,
  ctx: MergeContext
): InferredTypeReference | undefined {
  const mergedValue = mergeInferredTypes(a.value, b.value, ctx);
  if (!mergedValue) {
    return undefined;
  }

  return {
    value: mergedValue,
    optional: a.optional || b.optional,
  };
}

export function inferredTypeReferenceToAst(
  { value }: InferredTypeReference,
  schema: InferredSchema
): AST.ScalarType | AST.TypeRef {
  if (isInferredScalarType(value)) {
    return inferredScalarTypeToAst(value, schema);
  }

  if (isInferredObjectType(value)) {
    const name = schema.rootNames.getKey(value);
    invariant(
      isNotUndefined(name),
      "Root type reference without assigned name"
    );

    return AST.typeRef(AST.typeName(name), value.live);
  }

  throw new Error("Not implemented");
}
