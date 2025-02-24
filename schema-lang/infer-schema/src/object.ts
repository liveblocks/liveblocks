import type { PlainLsonObject } from "@liveblocks/core";
import { AST } from "@liveblocks/schema";

import type { InferredFields } from "./field.js";
import {
  inferLsonFields,
  inferredFieldsToAst,
  mergeInferredFields,
} from "./field.js";
import type { ChildContext, InferredType, MergeContext } from "./inference.js";
import type { ScoredNames } from "./naming.js";
import { generateNames, mergeScoredNames } from "./naming.js";
import type { NonLiveJsonObject } from "./plainLson.js";
import type { InferredSchema } from "./schema.js";
import { invariant } from "./utils/invariant.js";
import { isNotUndefined } from "./utils/typeGuards.js";
import type { PartialBy } from "./utils/types.js";

export type InferredObjectType = {
  type: "Object";
  live: boolean;
  fields: InferredFields;
  names: ScoredNames;
  atomic: boolean;
};

export function inferObjectType(
  value: NonLiveJsonObject | PlainLsonObject,
  ctx: ChildContext
): InferredObjectType {
  const isLive = value.liveblocksType === "LiveObject";
  const inferred: PartialBy<InferredObjectType, "fields"> = {
    names: generateNames(ctx),
    type: "Object",
    live: isLive,
    atomic: false,
  };

  const data = isLive ? value.data : value;
  inferred.fields = inferLsonFields(data, {
    ...ctx,
    parent: inferred,
  });

  return inferred as InferredObjectType;
}

export function mergeInferredObjectTypes(
  a: InferredObjectType,
  b: InferredObjectType,
  ctx: MergeContext
): InferredObjectType | undefined {
  // Cannot merge live and non-live objects
  if (a.live !== b.live) {
    return undefined;
  }

  // Never merge atomic objects
  if (a.atomic || b.atomic) {
    return undefined;
  }

  const mergedFields = mergeInferredFields(a.fields, b.fields, ctx);
  if (!mergedFields) {
    return undefined;
  }

  const merged: InferredObjectType = {
    live: a.live,
    names: mergeScoredNames(a.names, b.names),
    type: "Object",
    fields: mergedFields,
    atomic: false,
  };

  ctx.typeReplacements.set(a, merged);
  ctx.typeReplacements.set(b, merged);

  return merged;
}

export function inferredObjectTypeToAst(
  inferred: InferredObjectType,
  schema: InferredSchema
): AST.ObjectTypeDefinition {
  const name = schema.rootNames.getKey(inferred);
  invariant(isNotUndefined(name), "Object type without assigned name");

  return AST.objectTypeDefinition(
    AST.typeName(name),
    inferredFieldsToAst(inferred.fields, schema),
    null,
    !inferred.live
  );
}

export function isInferredObjectType(
  value: InferredType
): value is InferredObjectType {
  return value.type === "Object";
}
