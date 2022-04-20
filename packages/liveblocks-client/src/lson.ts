import type { LiveList } from "./LiveList";
import type { LiveMap } from "./LiveMap";
import type { LiveObject } from "./LiveObject";
import type { Json } from "./json";

/**
 * Think of Lson as a sibling of the Json data tree, except that the nested
 * data structure can contain a mix of Json values and LiveStructure instances.
 */
export type Lson =
  | Json

  // Or they are LiveStructure class instances
  | LiveObject<LsonObject>
  | LiveList<Lson>
  | LiveMap<string, Lson>;

/**
 * A mapping of keys to Lson values. A Lson value is any valid JSON
 * value or a Live storage data structure (LiveMap, LiveList, etc.)
 */
export type LsonObject = { [key: string]: Lson };

/**
 * Helper type to convert any valid Lson type to the equivalent Json type.
 *
 * Examples:
 *
 *   ToJson<42>                         // 42
 *   ToJson<'hi'>                       // 'hi'
 *   ToJson<number>                     // number
 *   ToJson<string>                     // string
 *   ToJson<string | LiveList<number>>  // string | number[]
 *   ToJson<LiveMap<string, LiveList<number>>>
 *                                      // { [key: string]: number[] }
 *   ToJson<LiveObject<{ a: number, b: LiveList<string> }>>
 *                                      // { a: null, b: string[] }
 *
 */
// prettier-ignore
export type ToJson<T extends Lson | LsonObject> =
  // Any Json value already is a legal Json value
  T extends Json ? T :

  // Any LsonObject recursively becomes a JsonObject
  T extends LsonObject ? { [K in keyof T]: ToJson<T[K]> } :

  // A LiveList serializes to an equivalent JSON array
  T extends LiveList<infer I> ? ToJson<I>[] :

  // A LiveObject serializes to an equivalent JSON object
  T extends LiveObject<infer O> ? { [K in keyof O]: ToJson<O[K]> } :

  // A LiveMap serializes to a JSON object with string-V pairs
  T extends LiveMap<infer KS, infer V> ? { [K in KS]: ToJson<V> } :

  // Otherwise, this is not possible
  never;
