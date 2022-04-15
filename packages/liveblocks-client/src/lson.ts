import type { LiveList } from "./LiveList";
import type { LiveMap } from "./LiveMap";
import type { LiveObject } from "./LiveObject";

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
  | LiveMap<Lson>;

export type LsonScalar = string | number | boolean | null | undefined;

/**
 * A mapping of keys to Lson values. A Lson value is any valid JSON
 * value or a Live storage data structure (LiveMap, LiveList, etc.)
 */
export type LsonObject = { [key: string]: Lson | undefined };
