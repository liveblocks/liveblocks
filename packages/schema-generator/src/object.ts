import { JsonObject, LsonObject } from "@liveblocks/core";
import { PartialBy } from "./utils/types";
import {
  combineInferredFields,
  inferLsonFields,
  InferredFields,
  inferredFieldsToAst,
} from "./fields";
import { generateNames, mergeScoredNames, ScoredNames } from "./naming";
import { ChildContext, PlainLsonFields } from "./types";
import { AST } from "@liveblocks/schema";
import { InferredSchema } from "./schema";
import { invariant } from "./utils/invariant";

export type InferredObjectType = {
  type: "Object";
  live: boolean;
  fields: InferredFields;
  names: ScoredNames;
  atomic: boolean;
};

export function inferObjectType(
  value: JsonObject | LsonObject,
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

  const data = isLiveObject ? value.data : value;
  inferred.fields = inferLsonFields(data as PlainLsonFields, {
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

  const combinedFields = combineInferredFields(a.fields, b.fields);
  if (!combinedFields) {
    return undefined;
  }

  return {
    live: a.live,
    names: mergeScoredNames(a.names, b.names),
    type: "Object",
    fields: combinedFields,
    atomic: false,
  };
}

export function inferredObjectTypeToAst(
  inferred: InferredObjectType,
  schema: InferredSchema
): AST.ObjectTypeDefinition {
  const name = schema.rootNames.getKey(inferred);
  invariant(name != null, "Object type without assigned name");

  return {
    _kind: "ObjectTypeDefinition",
    name: { _kind: "TypeName", name, range: [0, 0] },
    fields: inferredFieldsToAst(inferred.fields, schema),
    range: [0, 0],
  };
}
