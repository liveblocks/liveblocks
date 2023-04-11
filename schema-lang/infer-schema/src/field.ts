import { AST } from "@liveblocks/schema";
import { string } from "decoders";

import type { ChildContext, MergeContext } from "./inference";
import { invalidFieldName } from "./naming";
import type { JsonObject, PlainLsonFields } from "./plainLson";
import type { InferredSchema } from "./schema";
import type { InferredTypeReference } from "./typeReference";
import {
  inferredTypeReferenceToAst,
  inferTypeReference,
  mergeInferredTypeReferences,
} from "./typeReference";
import { invariant } from "./utils/invariant";
import { get } from "./utils/object";
import { escapeNewlines, naiveQuote } from "./utils/strings";
import { isNotUndefined } from "./utils/typeGuards";

export type InferredFields = Record<string, InferredTypeReference>;

const RESERVED_NAMES = new Set(["liveblocksType"]);

const propertyKeyDecoder = string
  .refine((key) => key.length > 0, "cannot be empty")
  .refine((key) => !RESERVED_NAMES.has(key), "cannot be a reserved name")
  .refine((key) => key.match(/^[a-zA-Z]/) !== null, "must start with a letter")
  .refine(
    (key) => key.match(/^[a-zA-Z0-9_]*$/) !== null,
    "can only contain alphanumeric characters and underscores"
  );

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

export function mergeInferredFields(
  a: InferredFields,
  b: InferredFields,
  ctx: MergeContext
): InferredFields | undefined {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  const mergedFields: InferredFields = {};
  for (const key of keys) {
    const valueA = get(a, key);
    const valueB = get(b, key);

    if (!valueA || !valueB) {
      const mergedValue = valueA ?? valueB;

      // Should never happen
      invariant(isNotUndefined(mergedValue));

      mergedFields[key] = { ...mergedValue, optional: true };
      continue;
    }

    const mergedValue = mergeInferredTypeReferences(valueA, valueB, ctx);
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
  const validField: [string, InferredTypeReference][] = [];
  const invalidFields: [string, InferredTypeReference & { reason?: string }][] =
    [];

  Object.entries(fields).forEach(([name, value]) => {
    const result = propertyKeyDecoder.decode(name);
    if (result.ok) {
      validField.push([name, value]);
      return;
    }

    invalidFields.push([name, { ...value, reason: result.error.text }]);
  });

  const fieldDefs: AST.FieldDef[] = [];
  invalidFields.forEach(([name, value], i) => {
    fieldDefs.push(
      AST.fieldDef(
        AST.identifier(invalidFieldName(i)),
        value.optional,
        inferredTypeReferenceToAst(value, schema),
        null,
        `FIXME: Field name ${escapeNewlines(naiveQuote(name))} is illegal, ${
          value.reason
        }`
      )
    );
  });

  validField.forEach(([name, value]) => {
    fieldDefs.push(
      AST.fieldDef(
        AST.identifier(name),
        value.optional,
        inferredTypeReferenceToAst(value, schema)
      )
    );
  });

  return fieldDefs;
}
