/**
 * Represents an indefinitely deep arbitrary immutable data
 * structure.
 */

export type Immutable = Scalar | ImmutableList | ImmutableObject | ImmutableMap;
type Scalar = string | number | boolean | null;
type ImmutableList = readonly Immutable[];
type ImmutableObject = { readonly [key: string]: Immutable | undefined };
type ImmutableMap = ReadonlyMap<string, Immutable>;
