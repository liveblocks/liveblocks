import type { Json } from "../lib/Json";
import type { PlainLson } from "../types/PlainLson";
import { LiveList } from "./LiveList";
import { LiveMap } from "./LiveMap";
import { LiveObject } from "./LiveObject";
import type { Lson, LsonObject } from "./Lson";

/**
 * Helper type to convert any valid Lson type to the equivalent Json type.
 *
 * Examples:
 *
 *   ToImmutable<42>                         // 42
 *   ToImmutable<'hi'>                       // 'hi'
 *   ToImmutable<number>                     // number
 *   ToImmutable<string>                     // string
 *   ToImmutable<string | LiveList<number>>  // string | readonly number[]
 *   ToImmutable<LiveMap<string, LiveList<number>>>
 *                                           // ReadonlyMap<string, readonly number[]>
 *   ToImmutable<LiveObject<{ a: number, b: LiveList<string>, c?: number }>>
 *                                           // { readonly a: null, readonly b: readonly string[], readonly c?: number }
 *
 */
// prettier-ignore
export type ToImmutable<L extends Lson | LsonObject> =
  // A LiveList serializes to an equivalent JSON array
  L extends LiveList<infer I> ? readonly ToImmutable<I>[] :

  // A LiveObject serializes to an equivalent JSON object
  L extends LiveObject<infer O> ? ToImmutable<O> :

  // A LiveMap serializes to a JSON object with string-V pairs
  L extends LiveMap<infer K, infer V> ? ReadonlyMap<K, ToImmutable<V>> :

  // Any LsonObject recursively becomes a JsonObject
  L extends LsonObject ?
    { readonly [K in keyof L]: ToImmutable<Exclude<L[K], undefined>>
                                 | (undefined extends L[K] ? undefined : never) } :

  // Any Json value already is a legal Json value
  L extends Json ? L :

  // Otherwise, this is not possible
  never;

/**
 * Returns PlainLson for a given Json or LiveStructure, suitable for calling the storage init api
 */
export function toPlainLson(lson: Lson): PlainLson {
  if (lson instanceof LiveObject) {
    return {
      liveblocksType: "LiveObject",
      data: Object.fromEntries(
        Object.entries(lson.toObject()).flatMap(([key, value]) =>
          value !== undefined ? [[key, toPlainLson(value)]] : []
        )
      ),
    };
  } else if (lson instanceof LiveMap) {
    return {
      liveblocksType: "LiveMap",
      data: Object.fromEntries(
        [...lson].map(([key, value]) => [key, toPlainLson(value)])
      ),
    };
  } else if (lson instanceof LiveList) {
    return {
      liveblocksType: "LiveList",
      data: [...lson].map((item) => toPlainLson(item)),
    };
  } else {
    return lson;
  }
}
