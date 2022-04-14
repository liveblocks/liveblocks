import type { LiveList } from "./LiveList";
import type { LiveMap } from "./LiveMap";
import type { LiveObject } from "./LiveObject";
import type { LiveRegister } from "./LiveRegister";

export type Dict<V> = { [key: string]: V | undefined };

// type Tree<TLeaf> = TLeaf | TreeList<TLeaf> | TreeObject<TLeaf>;
// type TreeList<TLeaf> = Tree<TLeaf>[];
// type TreeObject<TLeaf> = { [key: string]: Tree<TLeaf> | undefined };

/**
 * Represents an indefinitely deep arbitrary JSON data structure. There are
 * four types that make up the Json family:
 *
 * - Json         any legal JSON value
 * - JsonScalar   any legal JSON leaf value (no lists or objects)
 * - JsonArray    a JSON value whose outer type is an array
 * - JsonObject   a JSON value whose outer type is an object
 *
 */
export type Json = JsonScalar | JsonArray | JsonObject;
export type JsonScalar = string | number | boolean | null | undefined;
export type JsonArray = Json[];
export type JsonObject = { [key: string]: Json | undefined };

/**
 * Think of LiveData as a sibling of the Json data tree, except that the nested
 * data structure can contain a mix of Json values and LiveXxx instances.
 */
export type LiveData =
  | LiveDataScalar
  | LiveListData
  | LiveObjectData

  // Or they are LiveXxx class instances
  | LiveObject<LiveObjectData>
  | LiveList<LiveData>
  | LiveMap<LiveData>
  | LiveRegister<Json>;

export type LiveDataScalar = string | number | boolean | null | undefined;

// TODO: Replace this named type and instead inline LiveData[] in call sites - much clearer!
type LiveListData = LiveData[];

/**
 * A mapping of keys to LiveData values. A LiveData value is any valid JSON
 * value or a Live storage data structure (LiveMap, LiveList, etc.)
 */
export type LiveObjectData = { [key: string]: LiveData | undefined };
