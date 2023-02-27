import { AST } from "@liveblocks/schema";

import type { InferredType } from "./inference";
import { isAtomic } from "./inference";
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
type RootReferences = Map<InferredObjectType, Set<InferredTypeReference>>;
type RootNames = BidirectionalMap<string, InferredObjectType>;

export type InferredSchema = {
  rootTypes: RootTypes;
  rootTypeReferences: RootReferences;
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
): Pick<InferredSchema, "rootTypes" | "rootTypeReferences"> {
  const rootTypes: RootTypes = new Set();
  const rootTypeReferences: RootReferences = new Map();

  for (const [type, referenceObj] of iterateInferredTypesDeep(inferred)) {
    if (isInferredObjectType(type)) {
      rootTypes.add(type);

      if (referenceObj) {
        const references = rootTypeReferences.get(type) ?? new Set();
        references.add(referenceObj);
        rootTypeReferences.set(type, references);
      }
    }
  }

  return { rootTypes, rootTypeReferences };
}

export function replaceRootType(
  schema: InferredSchema,
  oldType: InferredObjectType,
  newType: InferredObjectType
): void {
  invariant(schema.rootTypes.has(oldType), "Old type not part of the schema");

  // Re-wire all references to the old type to the new type
  const oldTypeReferences = schema.rootTypeReferences.get(oldType);
  if (oldTypeReferences) {
    const newReferences = schema.rootTypeReferences.get(newType) ?? new Set();
    for (const reference of oldTypeReferences) {
      reference.value = newType;
      newReferences.add(reference);
    }
    schema.rootTypeReferences.delete(oldType);
    schema.rootTypeReferences.set(newType, newReferences);
  }

  schema.rootTypes.delete(oldType);
  schema.rootTypes.add(newType);
  schema.rootNames.deleteValue(oldType);
}

function assignNameOrMerge(schema: InferredSchema, type: InferredObjectType) {
  invariant(schema.rootTypes.has(type), "Root type not part of the schema");
  invariant(!schema.rootNames.hasValue(type), "Root type already has a name");

  const orderedNames = Object.entries(type.names)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .map(([name]) => name);

  // TODO: Be smarter about when to merge types, and when to rename them.
  // Might also be worth a try to rename both types e.g. "Data" conflicts with "Data" ->
  // rename them to "UserData" and "ShapeData" instead of keeping "Data" and adding "UserData".
  for (const name of orderedNames) {
    const existingType = schema.rootNames.get(name);
    if (!existingType) {
      schema.rootNames.set(name, type);
      return;
    }

    const merged = mergeInferredObjectTypes(existingType, type, schema);
    if (merged) {
      schema.rootNames.set(name, merged);
      return;
    }
  }

  const baseName = orderedNames[0];
  invariant(isNotUndefined(baseName), "Expected at least one name");

  // Try Name2, Name3, etc. until we find a name that doesn't conflict.
  let n = 2;
  while (true) {
    const name = `${baseName}${n}`;
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
