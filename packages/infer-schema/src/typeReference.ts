import { AST } from "@liveblocks/schema";

import type { ChildContext, InferredType, MergeContext } from "./inference";
import { inferType, mergeInferredTypes } from "./inference";
import { isInferredObjectType } from "./object";
import type { PlainLson } from "./plainLson";
import { inferredScalarTypeToAst, isInferredScalarType } from "./scalar";
import type { InferredSchema } from "./schema";
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
