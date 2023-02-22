import { singular, ucFirst, words } from "./utils/strings";
import { ChildContext } from "./types";

export type ScoredNames = Map<string, number>;

export function mergeScoredNames(a: ScoredNames, b: ScoredNames): ScoredNames {
  const merged = new Map();

  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const key of keys) {
    const aScore = a.get(key) ?? 0;
    const bScore = b.get(key) ?? 0;
    merged.set(key, aScore + bScore);
  }

  return merged;
}

// "gameFields" -> "GameField", "__TEST_DATA__" -> "TestData" etc.
function fieldToTypeName(fieldName: string): string {
  return words(fieldName)
    .map((word) => singular(ucFirst(word)))
    .join("");
}

export function generateNames({ field, parent }: ChildContext): ScoredNames {
  const typeName = fieldToTypeName(field);

  const names: ScoredNames = new Map();
  names.set(typeName, 1);

  for (const [name, score] of parent.names.entries()) {
    names.set(`${name}${typeName}`, score * 0.5);
  }

  return names;
}
