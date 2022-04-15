import type { LiveList } from "./LiveList";
import type { LiveMap } from "./LiveMap";
import type { LiveObject } from "./LiveObject";

/**
 * Think of LiveData as a sibling of the Json data tree, except that the nested
 * data structure can contain a mix of Json values and LiveXxx instances.
 */
export type LiveData =
  | LiveDataScalar
  | LiveData[]
  | LiveObjectData

  // Or they are LiveXxx class instances
  | LiveObject<LiveObjectData>
  | LiveList<LiveData>
  | LiveMap<LiveData>;

export type LiveDataScalar = string | number | boolean | null | undefined;

/**
 * A mapping of keys to LiveData values. A LiveData value is any valid JSON
 * value or a Live storage data structure (LiveMap, LiveList, etc.)
 */
export type LiveObjectData = { [key: string]: LiveData | undefined };
