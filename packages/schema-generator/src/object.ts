import { JsonObject } from "@liveblocks/core";
import { PartialBy } from "./utils/types";
import {
  combineInferredFields,
  inferLsonFields,
  InferredFields,
  inferredFieldsToAst,
} from "./fields";
import { generateNames, mergeScoredNames, ScoredNames } from "./names";
import { ChildContext } from "./types";
import { AST } from "@liveblocks/schema";
import { InferredSchema } from "./schema";
import { invariant } from "./utils/invariant";

export type InferredObjectType = {
  type: "Object";
  fields: InferredFields;
  names: ScoredNames;
};

export function inferObjectType(
  value: JsonObject,
  ctx: ChildContext
): InferredObjectType {
  const inferred: PartialBy<InferredObjectType, "fields"> = {
    names: generateNames(ctx),
    type: "Object",
  };

  inferred.fields = inferLsonFields(value, {
    ...ctx,
    parent: inferred,
    json: true,
  });

  return inferred as InferredObjectType;
}

export function combineInferredObjectTypes(
  a: InferredObjectType,
  b: InferredObjectType
): InferredObjectType | undefined {
  const combinedFields = combineInferredFields(a.fields, b.fields);
  if (!combinedFields) {
    return undefined;
  }

  return {
    names: mergeScoredNames(a.names, b.names),
    type: "Object",
    fields: combinedFields,
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
