import {
  combineInferredTypes,
  inferredRootTypeToAst,
  InferredType,
  isAtomic,
} from ".";
import { InferredLiveObjectType } from "./liveObject";
import { InferredObjectType } from "./object";
import { InferredTypeReference } from "./typeReference";
import { invariant } from "./utils/invariant";
import { BidirectionalMap } from "./utils/bidirectionalMap";
import { AST } from "@liveblocks/schema";

export type InferredRootType = InferredObjectType | InferredLiveObjectType;

type RootTypes = Set<InferredRootType>;
type RootReferences = Map<InferredRootType, Set<InferredTypeReference>>;
type RootNames = BidirectionalMap<string, InferredRootType>;

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
      case "LiveObject":
      case "Object":
        for (const field of root.fields.values()) {
          yield* iterate(field.value, field);
        }
        return;
    }
  }

  yield* iterate(root);
}

function inferRootTypes(
  inferred: InferredLiveObjectType
): Pick<InferredSchema, "rootTypes" | "rootTypeReferences"> {
  const rootTypes: RootTypes = new Set();
  const rootTypeReferences: RootReferences = new Map();

  for (const [type, referenceObj] of iterateInferredTypesDeep(inferred)) {
    if (type.type === "Object" || type.type === "LiveObject") {
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

function replaceRootType(
  schema: InferredSchema,
  oldType: InferredRootType,
  newType: InferredRootType
) {
  invariant(schema.rootTypes.has(oldType), "Old type not part of the schema");

  schema.rootTypes.delete(oldType);
  schema.rootTypes.add(newType);
  schema.rootNames.deleteValue(oldType);

  // Re-wire all references to the old type to the new type
  const oldTypeReferences = schema.rootTypeReferences.get(oldType);
  if (oldTypeReferences) {
    const newReferences = schema.rootTypeReferences.get(newType) ?? new Set();
    for (const reference of oldTypeReferences) {
      reference.value = newType;
      newReferences.add(reference);
    }
    schema.rootTypeReferences.set(newType, oldTypeReferences);
  }
}

function assignNameOrMerge(schema: InferredSchema, type: InferredRootType) {
  invariant(schema.rootTypes.has(type), "Root type not part of the schema");
  invariant(!schema.rootNames.hasValue(type), "Root type already has a name");

  const orderedNames = Array.from(type.names.entries())
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .map(([name]) => name);

  // TODO: Be smarter about when to merge types, and when to rename them.
  for (const name of orderedNames) {
    const existingType = schema.rootNames.get(name);
    if (!existingType) {
      schema.rootNames.set(name, type);
      return;
    }

    const combined = combineInferredTypes(existingType, type) as
      | InferredRootType
      | undefined;

    if (combined) {
      replaceRootType(schema, existingType, combined);
      replaceRootType(schema, type, combined);
      return;
    }
  }

  // Try Name2, Name3, etc. until we find a name that doesn't conflict.
  let suffix = 2;
  while (true) {
    const name = `${type.type}${suffix}`;
    if (!schema.rootNames.has(name)) {
      schema.rootNames.set(name, type);
      return;
    }

    suffix++;
  }
}

export function inferSchema(inferredStorage: InferredLiveObjectType) {
  const rootTypes = inferRootTypes(inferredStorage);
  const schema: InferredSchema = {
    ...rootTypes,
    rootNames: new BidirectionalMap(),
  };

  const toAssign = Array.from(schema.rootTypes.values()).sort((a, b) => {
    const aIsAtomic = isAtomic(a);
    const bIsAtomic = isAtomic(b);
    if (aIsAtomic && bIsAtomic) {
      return 0;
    }
    if (aIsAtomic || bIsAtomic) {
      return aIsAtomic ? -1 : 1;
    }

    // TODO: Assign names to root types with fewer aliases first?
    return Math.max(...a.names.values()) - Math.max(...b.names.values());
  });

  toAssign.forEach((type) => assignNameOrMerge(schema, type));
  return schema;
}

export function schemaToAst(schema: InferredSchema): AST.Document {
  return {
    _kind: "Document",
    definitions: Array.from(schema.rootTypes.values()).map((rootType) =>
      inferredRootTypeToAst(rootType, schema)
    ),
    range: [0, 0],
  };
}
