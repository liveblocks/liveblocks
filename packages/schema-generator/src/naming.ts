import type { ChildContext } from "./inference";
import { singular, ucFirst, words } from "./utils/strings";

export type ScoredNames = Record<string, number>;

export function mergeScoredNames(a: ScoredNames, b: ScoredNames): ScoredNames {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const mergedEntries = Array.from(keys.values(), (key) => [
    key,
    (a[key] ?? 0) + (b[key] ?? 0),
  ]);
  return Object.fromEntries(mergedEntries);
}

// "gameFields" -> "GameField", "__TEST_DATA__" -> "TestData" etc.
function fieldToTypeName(fieldName: string): string {
  return words(fieldName)
    .map((word) => singular(ucFirst(word)))
    .join("");
}

export function generateNames({ field, parent }: ChildContext): ScoredNames {
  const typeName = fieldToTypeName(field);

  const aliasEntries = Object.entries(parent.names)
    .map(([name, score]) => [
      // Data -> ScoreData, ScoreData -> GameScoreData etc.
      `${name}${typeName}`,
      score * 0.5,
    ])
    // Only keep aliases with a score of at least 0.25 (= a depth of at most 3)
    // to avoid overly long names
    .filter(([, score]) => score >= 0.25);

  return mergeScoredNames({ [typeName]: 1 }, Object.fromEntries(aliasEntries));
}
