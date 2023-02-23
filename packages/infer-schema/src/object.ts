import { AST } from "@liveblocks/schema";

import type { InferredFields } from "./fields";
import {
  inferLsonFields,
  inferredFieldsToAst,
  mergeInferredFields,
} from "./fields";
import type { ChildContext, InferredType } from "./inference";
import type { ScoredNames } from "./naming";
import { generateNames, mergeScoredNames } from "./naming";
import type { JsonObject, PlainLsonFields, PlainLsonObject } from "./plainLson";
import type { InferredSchema } from "./schema";
import { invariant } from "./utils/invariant";
import { isNotUndefined } from "./utils/typeGuards";
import type { PartialBy } from "./utils/types";

export type InferredObjectType = {
  type: "Object";
  live: boolean;
  fields: InferredFields;
  names: ScoredNames;
  atomic: boolean;
};

export function inferObjectType(
  value: JsonObject | PlainLsonObject,
  ctx: ChildContext
): InferredObjectType {
  // Since we allow arbitrary json objects, we need to be sure we are not inside a json
  // context before we check the liveblocksType property because the user could have
  // a field called liveblocksType in their json object
  const isLiveObject = !ctx.json && value.liveblocksType === "LiveObject";

  const inferred: PartialBy<InferredObjectType, "fields"> = {
    names: generateNames(ctx),
    type: "Object",
    live: isLiveObject,
    atomic: false,
  };

  const data = (isLiveObject ? value.data : value) as PlainLsonFields;
  inferred.fields = inferLsonFields(data, {
    ...ctx,
    parent: inferred,
    json: !isLiveObject,
  });

  return inferred as InferredObjectType;
}

export function mergeInferredObjectTypes(
  a: InferredObjectType,
  b: InferredObjectType
): InferredObjectType | undefined {
  // Cannot merge live and non-live objects
  if (a.live !== b.live) {
    return undefined;
  }

  // Never merge atomic objects
  if (a.atomic || b.atomic) {
    return undefined;
  }

  const mergedFields = mergeInferredFields(a.fields, b.fields);
  if (!mergedFields) {
    return undefined;
  }

  return {
    live: a.live,
    names: mergeScoredNames(a.names, b.names),
    type: "Object",
    fields: mergedFields,
    atomic: false,
  };
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
    !inferred.live
  );
}

export function isInferredObjectType(
  value: InferredType
): value is InferredObjectType {
  return value.type === "Object";
}
