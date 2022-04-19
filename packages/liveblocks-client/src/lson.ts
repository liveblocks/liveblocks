import type { LiveList } from "./LiveList";
import type { LiveMap } from "./LiveMap";
import type { LiveObject } from "./LiveObject";
import type { LiveRegister } from "./LiveRegister";
import type { Json } from "./json";

/**
 * Think of Lson as a sibling of the Json data tree, except that the nested
 * data structure can contain a mix of Json values and LiveXxx instances.
 */
export type Lson =
  | LsonScalar
  | Lson[]
  | LsonObject

  // Or they are LiveXxx class instances
  | LiveObject<LsonObject>
  | LiveList<Lson>
  | LiveMap<Lson>
  | LiveRegister<Json>;

export type LsonScalar = string | number | boolean | null;

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
 *   ToJson<string | number[]>          // string | number[]
 *   ToJson<LiveMap<LiveList<number>>>  // { [key: string]: number[] }
 *   ToJson<{ a: number, b: LiveList<string> }>
 *                                      // { a: number, b: string[] }
 *   ToJson<LiveObject<{ a: number, b: LiveList<string> }>>
 *                                      // { a: null, b: string[] }
 *   ToJson<LiveRegister<{ a: number | null }>>
 *                                      // { a: number | null }
 *
 */
// prettier-ignore
export type ToJson<T extends Lson> =
  // Any Json value already is a legal Json value
  T extends Json ? T :

  // Any Lson[] recursively becomes a Json[]
  T extends Lson[] ? ToJson<T[number]>[] :

  // Any LsonObject recursively becomes a JsonObject
  T extends LsonObject ? { [K in keyof T]: ToJson<Exclude<T[K], undefined>> } :

  // A LiveRegister holds a simple Json value
  T extends LiveRegister<infer J> ? J :

  // A LiveList serializes to an equivalent JSON array
  T extends LiveList<infer I> ? ToJson<I>[] :

  // A LiveObject serializes to an equivalent JSON object
  T extends LiveObject<infer O> ? { [K in keyof O]: ToJson<Exclude<O[K], undefined>> } :

  // A LiveMap serializes to a JSON object with string-V pairs
  T extends LiveMap<infer V> ? { [key: string]: ToJson<V> } :

  // Otherwise, this is not possible
  never;
