import { AST } from "@liveblocks/schema";

import type { InferredType, MergeContext } from "./inference";
import { isAtomic } from "./inference";
import { orderedNames } from "./naming";
import type { InferredObjectType } from "./object";
import {
  inferredObjectTypeToAst,
  isInferredObjectType,
  mergeInferredObjectTypes,
} from "./object";
import type { InferredTypeReference } from "./typeReference";
import { BidirectionalMap } from "./utils/bidirectionalMap";
import { invariant } from "./utils/invariant";
import { isNotUndefined } from "./utils/typeGuards";

type RootTypes = Set<InferredObjectType>;
type RootNames = BidirectionalMap<string, InferredObjectType>;

export type InferredSchema = {
  rootTypes: RootTypes;
  rootNames: RootNames;
};

// Deeply iterate over a inferred type, yielding the type and optionally the type reference
// object referencing it.
// If yieldCircularReferences is true, the same type can be yielded multiple times
// if another type circularly references it in order to yield all references to that type.
function* iterateInferredTypesDeep(
  root: InferredType,
  yieldCircularReferences = true
): Generator<[InferredType, InferredTypeReference | undefined]> {
  const visited = new Set<InferredType>();

  function* iterate(
    root: InferredType,
    referenceObj: InferredTypeReference | undefined = undefined
  ): Generator<[InferredType, InferredTypeReference | undefined]> {
    if (visited.has(root)) {
      if (yieldCircularReferences && referenceObj) {
        yield [root, referenceObj];
      }

      return;
    }

    visited.add(root);

    yield [root, referenceObj];
    switch (root.type) {
      case "Object":
        for (const field of Object.values(root.fields)) {
          yield* iterate(field.value, field);
        }
        return;
    }
  }

  yield* iterate(root);
}

function inferRootTypes(
  inferred: InferredObjectType
): Pick<InferredSchema, "rootTypes"> {
  const rootTypes: RootTypes = new Set();

  for (const [type] of iterateInferredTypesDeep(inferred)) {
    if (isInferredObjectType(type)) {
      rootTypes.add(type);
    }
  }

  return { rootTypes };
}

function applyRootTypeReplacements(
  schema: InferredSchema,
  replacements: Map<InferredObjectType, InferredObjectType>
): void {
  replacements.forEach((newType, oldType) => {
    invariant(schema.rootTypes.has(oldType), "Old type not found in schema");

    schema.rootTypes.delete(oldType);
    schema.rootTypes.add(newType);
    schema.rootNames.deleteValue(oldType);
  });

  schema.rootTypes.forEach((rootType) => {
    for (const [, ref] of iterateInferredTypesDeep(rootType)) {
      if (!ref || !isInferredObjectType(ref.value)) {
        continue;
      }

      const replacement = replacements.get(ref.value);
      if (replacement) {
        ref.value = replacement;
      }
    }
  });
}

function mergeInferredRootTypes(
  schema: InferredSchema,
  a: InferredObjectType,
  b: InferredObjectType
): InferredObjectType | undefined {
  const mergeCtx: MergeContext = {
    mergeFns: new Map(),
    typeReplacements: new Map(),
  };

  const merged = mergeInferredObjectTypes(a, b, mergeCtx);
  if (!merged) {
    return;
  }

  const rootReplacements = new Map<InferredObjectType, InferredObjectType>();
  const references: Map<
    InferredObjectType,
    Set<InferredObjectType>
  > = new Map();

  // Abuse the face that maps iterate in insertion order
  mergeCtx.typeReplacements.forEach((newType, oldType) => {
    if (!isInferredObjectType(oldType) || !isInferredObjectType(newType)) {
      return;
    }

    if (schema.rootTypes.has(oldType)) {
      rootReplacements.set(oldType, newType);
    }

    const newTypeReferences = references.get(newType) ?? new Set();
    const oldTypeReferences = references.get(oldType);
    oldTypeReferences?.forEach((key) => {
      newTypeReferences.add(key);
      rootReplacements.set(key, newType);
    });

    references.set(newType, newTypeReferences);
  });

  applyRootTypeReplacements(schema, rootReplacements);
  return merged;
}

function assignNameOrMerge(schema: InferredSchema, type: InferredObjectType) {
  invariant(schema.rootTypes.has(type), "Root type not part of the schema");
  invariant(!schema.rootNames.hasValue(type), "Root type already has a name");

  const names = orderedNames(type.names);

  // TODO: Be smarter about when to merge types, and when to rename them.
  // Might also be worth a try to rename both types e.g. "Data" conflicts with "Data" ->
  // rename them to "UserData" and "ShapeData" instead of keeping "Data" and adding "UserData".
  for (const name of names) {
    const existingType = schema.rootNames.get(name);
    if (!existingType) {
      schema.rootNames.set(name, type);
      return;
    }

    const merged = mergeInferredRootTypes(schema, existingType, type);
    if (merged) {
      schema.rootNames.set(name, merged!);
      return;
    }
  }

  const preferredName = names[0];
  invariant(isNotUndefined(preferredName), "Expected at least one name");

  // Try Name2, Name3, etc. until we find a name that doesn't conflict.
  let n = 2;
  while (true) {
    const name = `${preferredName}${n}`;
    if (!schema.rootNames.has(name)) {
      schema.rootNames.set(name, type);
      return;
    }
    n++;
  }
}

function getNextRootTypeToAssignName(schema: InferredSchema) {
  return Array.from(schema.rootTypes.values())
    .filter((type) => !schema.rootNames.hasValue(type))
    .sort((a, b) => {
      const aIsAtomic = isAtomic(a);
      const bIsAtomic = isAtomic(b);
      if (aIsAtomic && bIsAtomic) {
        return 0;
      }
      if (aIsAtomic || bIsAtomic) {
        return aIsAtomic ? -1 : 1;
      }

      // TODO: Assign names to root types with fewer aliases first?
      return (
        Math.max(...Object.values(a.names)) -
        Math.max(...Object.values(b.names))
      );
    })[0];
}

export function buildSchema(
  inferredStorage: InferredObjectType
): InferredSchema {
  const rootTypes = inferRootTypes(inferredStorage);
  const schema: InferredSchema = {
    ...rootTypes,
    rootNames: new BidirectionalMap(),
  };

  let toAssign = getNextRootTypeToAssignName(schema);
  while (toAssign) {
    assignNameOrMerge(schema, toAssign);
    toAssign = getNextRootTypeToAssignName(schema);
  }

  // TODO: Merge equal types?

  return schema;
}

export function inferredSchemaToAst(schema: InferredSchema): AST.Document {
  return AST.document(
    Array.from(schema.rootTypes.values()).map((rootType) =>
      inferredObjectTypeToAst(rootType, schema)
    )
  );
}
