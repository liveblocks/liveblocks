import type { LiveList } from "../crdts/LiveList";
import type { LiveMap } from "../crdts/LiveMap";
import type { LiveObject } from "../crdts/LiveObject";
import type { LiveRegister } from "../crdts/LiveRegister";
import type { Json } from "../lib/Json";

export type LiveStructure =
  | LiveObject<LsonObject>
  | LiveList<Lson>
  | LiveMap<string, Lson>;

/**
 * Think of Lson as a sibling of the Json data tree, except that the nested
 * data structure can contain a mix of Json values and LiveStructure instances.
 */
export type Lson = Json | LiveStructure;

/**
 * LiveNode is the internal tree for managing Live data structures. The key
 * difference with Lson is that all the Json values get represented in
 * a LiveRegister node.
 */
export type LiveNode =
  | LiveStructure

  // LiveRegister is for private/internal use only
  | LiveRegister<Json>;

/**
 * A mapping of keys to Lson values. A Lson value is any valid JSON
 * value or a Live storage data structure (LiveMap, LiveList, etc.)
 */
export type LsonObject = { [key: string]: Lson | undefined };

/**
 * Helper type to convert any valid Lson type to the equivalent Json type.
 *
 * Examples:
 *
 *   ToJson<42>                         // 42
 *   ToJson<'hi'>                       // 'hi'
 *   ToJson<number>                     // number
 *   ToJson<string>                     // string
 *   ToJson<string | LiveList<number>>  // string | readonly number[]
 *   ToJson<LiveMap<string, LiveList<number>>>
 *                                      // { readonly [key: string]: readonly number[] }
 *   ToJson<LiveObject<{ a: number, b: LiveList<string>, c?: number }>>
 *                                      // { readonly a: null, readonly b: readonly string[], readonly c?: number }
 */
// prettier-ignore
export type ToJson<L extends Lson | LsonObject> =
  // A LiveList serializes to an equivalent JSON array
  L extends LiveList<infer I> ? readonly ToJson<I>[] :

  // A LiveObject serializes to an equivalent JSON object
  L extends LiveObject<infer O> ? ToJson<O> :

  // A LiveMap serializes to a JSON object with string-V pairs
  L extends LiveMap<infer KS, infer V> ? { readonly [P in KS]: ToJson<V> } :

  // Any LsonObject recursively becomes a JsonObject
  L extends LsonObject ?
    { readonly [K in keyof L]: ToJson<Exclude<L[K], undefined>>
                                 | (undefined extends L[K] ? undefined : never) } :

  // Any Json value already is a legal Json value
  L extends Json ? L :

  // Otherwise, this is not possible
  never;
