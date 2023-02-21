import { PlainLsonObject } from "./types";
import { PartialBy } from "./utils/types";
import {
  combineInferredFields,
  inferLsonFields,
  InferredFields,
  inferredFieldsToAst,
} from "./fields";
import { generateNames, mergeScoredNames, ScoredNames } from "./names";
import { ChildContext } from "./types";
import { InferredSchema } from "./schema";
import { AST } from "@liveblocks/schema";
import { invariant } from "./utils/invariant";

export type InferredLiveObjectType = {
  type: "LiveObject";
  fields: InferredFields;
  names: ScoredNames;
  atomic: boolean;
};

export function inferLiveObjectType(
  value: PlainLsonObject,
  ctx: ChildContext
): InferredLiveObjectType {
  const inferred: PartialBy<InferredLiveObjectType, "fields"> = {
    type: "LiveObject",
    atomic: false,
    names: generateNames(ctx),
  };

  inferred.fields = inferLsonFields(value.data, { ...ctx, parent: inferred });
  return inferred as InferredLiveObjectType;
}

export function combineInferredLiveObjectTypes(
  a: InferredLiveObjectType,
  b: InferredLiveObjectType
): InferredLiveObjectType | undefined {
  // Atomic types can't be combined (Mainly the root "Storage" type)
  if (a.atomic || b.atomic) {
    return undefined;
  }

  const combinedFields = combineInferredFields(a.fields, b.fields);
  if (!combinedFields) {
    return undefined;
  }

  return {
    names: mergeScoredNames(a.names, b.names),
    type: "LiveObject",
    atomic: false,
    fields: combinedFields,
  };
}

export function inferredLiveObjectTypeToAst(
  inferred: InferredLiveObjectType,
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
