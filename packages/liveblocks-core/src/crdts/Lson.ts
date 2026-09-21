import type { LiveFile, LiveFileData } from "../crdts/LiveFile";
import type { LiveList } from "../crdts/LiveList";
import type { LiveMap } from "../crdts/LiveMap";
import type { LiveObject } from "../crdts/LiveObject";
import type { LiveRegister } from "../crdts/LiveRegister";
import type { LiveText, LiveTextData } from "../crdts/LiveText";
import type { Json, ReadonlyJson, ReadonlyJsonObject } from "../lib/Json";

export type LiveStructure =
  | LiveObject<LsonObject>
  | LiveList<Lson>
  | LiveMap<string, Lson>
  | LiveText
  | LiveFile;

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
export type LsonObject = Record<string, Lson | undefined>;

/**
 * The type of the values stored under an object type's string keys. The
 * `undefined` an optional key carries is not one of them.
 *
 * Examples:
 *
 *   ValueOf<{ a: number, b: string }>   // number | string
 *   ValueOf<{ a: number, b?: string }>  // number | string
 *   ValueOf<LsonObject>                 // Lson
 *
 * The last one is what this is for: `Lson extends ValueOf<O>` asks whether an
 * object's values are as wide as Lson itself, which is the case ToJson has to
 * short-circuit to avoid expanding forever.
 */
type ValueOf<O> = Exclude<O[Extract<keyof O, string>], undefined>;

/**
 * The Json object an Lson object serializes to: every value converted with
 * `ToJson`, optional keys staying optional.
 */
// prettier-ignore
type JsonObjectOf<O extends LsonObject> =
  { readonly [K in keyof O]: ToJson<Exclude<O[K], undefined>>
                               | (undefined extends O[K] ? undefined : never) };

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
  // Short-circuit fully opaque LiveList<Lson> to avoid recursive expansion
  L extends LiveList<infer I extends Lson> ?
    Lson extends I ? readonly ReadonlyJson[] :
    readonly ToJson<I>[] :

  // A LiveObject serializes to an equivalent JSON object
  // Short-circuit index-signature LiveObjects whose values are as wide as Lson,
  // to avoid recursive expansion (e.g. the fully opaque LiveObject<LsonObject>)
  // Otherwise, expand O here (instead of ToJson<O>) so that
  // Record<string, LiveObject<...>> doesn't hit the LsonObject branch's guard.
  L extends LiveObject<infer O extends LsonObject> ?
    string extends keyof O ?
      Lson extends ValueOf<O> ? ReadonlyJsonObject :
      JsonObjectOf<O> :
    JsonObjectOf<O> :

  // A LiveMap serializes to a JSON object with string-V pairs
  // Short-circuit fully opaque LiveMap<string, Lson> to avoid recursive expansion
  L extends LiveMap<infer KS extends string, infer V extends Lson> ?
    Lson extends V ? ReadonlyJsonObject :
    { readonly [K in KS]: ToJson<V> } :

  // A LiveText serializes to a delta so inline attributes are preserved
  L extends LiveText ?
    LiveTextData :

  // A LiveFile serializes to its immutable metadata
  L extends LiveFile ?
    LiveFileData :

  // Any LsonObject recursively becomes a JsonObject
  // Short-circuit index-signature objects whose values are as wide as Json, to
  // avoid ugly recursive expansion (e.g. ToJson<LsonObject> or ToJson<JsonObject>).
  L extends LsonObject ?
    string extends keyof L ?
      L extends Record<string, infer V> ?
        [Json] extends [V] ? ReadonlyJsonObject :
        JsonObjectOf<L> :
      JsonObjectOf<L> :
    JsonObjectOf<L> :

  // Any Json value already is a legal Json value
  L extends Json ? L :

  // Otherwise, this is not possible
  never;
