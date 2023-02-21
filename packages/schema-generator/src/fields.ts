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

export type InferredFields = Map<string, InferredTypeReference>;

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

  return new Map(fieldEntries);
}

export function combineInferredFields(
  a: InferredFields,
  b: InferredFields
): InferredFields | undefined {
  const combined = new Map(a);

  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const key of keys) {
    const childA = a.get(key);
    const childB = b.get(key);

    if (!childA || !childB) {
      const combinedChild = childA ?? childB;

      // Should never happen
      invariant(isNotUndefined(combinedChild));

      combined.set(key, { ...combinedChild, optional: true });
      continue;
    }

    const combinedChild = combineTypeReferences(childA, childB);
    if (!combinedChild) {
      return undefined;
    }
  }

  return combined;
}

export function inferredFieldsToAst(
  fields: InferredFields,
  schema: InferredSchema
): AST.FieldDef[] {
  return Array.from(fields.entries()).map(([name, value]) => ({
    _kind: "FieldDef",
    name: { _kind: "Identifier", name, range: [0, 0] },
    type: inferredTypeReferenceToAst(value, schema),
    optional: value.optional,
    range: [0, 0],
  }));
}
