/**
 * Represents an indefinitely deep arbitrary immutable data
 * structure, as returned by the .toImmutable().
 */

export type Immutable = Scalar | ImmutableList | ImmutableObject | ImmutableMap;
type Scalar = string | number | boolean | null;
type ImmutableList = readonly Immutable[];
type ImmutableObject = { readonly [key: string]: Immutable | undefined };
type ImmutableMap = ReadonlyMap<string, Immutable>;

export function isScalar(data: Immutable): data is Scalar {
  return (
    data === null ||
    typeof data === "string" ||
    typeof data === "number" ||
    typeof data === "boolean"
  );
}
