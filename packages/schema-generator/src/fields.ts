import { AST } from "@liveblocks/schema";
import { InferredSchema } from "./schema";
import {
  combineTypeReferences,
  InferredTypeReference,
  inferredTypeReferenceToAst,
  inferTypeReference,
} from "./typeReference";
import { ChildContext, JsonObject, PlainLsonFields } from "./types";
import { invariant } from "./utils/invariant";
import { isNotUndefined } from "./utils/typeGuards";

export type InferredFields = Record<string, InferredTypeReference>;

export function inferLsonFields(
  fields: PlainLsonFields | JsonObject,
  ctx: Omit<ChildContext, "field">
): InferredFields {
  const fieldEntries = Object.entries(fields)
    .map(([key, value]) => {
      if (value === undefined) {
        return undefined;
      }

      return [key, inferTypeReference(value, { ...ctx, field: key })] as const;
    })
    .filter(isNotUndefined);

  return Object.fromEntries(fieldEntries);
}

export function combineInferredFields(
  a: InferredFields,
  b: InferredFields
): InferredFields | undefined {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  const mergedFields: InferredFields = {};
  for (const key of keys) {
    const valueA = a[key];
    const valueB = b[key];

    if (!valueA || !valueB) {
      const mergedValue = valueA ?? valueB;

      // Should never happen
      invariant(isNotUndefined(mergedValue));

      mergedValue[key] = { ...mergedValue, optional: true };
      continue;
    }

    const mergedValue = combineTypeReferences(valueA, valueB);
    if (!mergedValue) {
      return undefined;
    }

    mergedFields[key] = mergedValue;
  }

  return mergedFields;
}

export function inferredFieldsToAst(
  fields: InferredFields,
  schema: InferredSchema
): AST.FieldDef[] {
  return Object.entries(fields).map(([name, value]) => ({
    _kind: "FieldDef",
    name: { _kind: "Identifier", name, range: [0, 0] },
    type: inferredTypeReferenceToAst(value, schema),
    optional: value.optional,
    range: [0, 0],
  }));
}
