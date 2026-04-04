import type { PlainLson } from "../types/PlainLson";
import { LiveList } from "./LiveList";
import { LiveMap } from "./LiveMap";
import { LiveObject } from "./LiveObject";
import type { Lson } from "./Lson";

/**
 * Returns PlainLson for a given Json or LiveStructure, suitable for calling the storage init api
 */
export function toPlainLson(lson: Lson): PlainLson {
  if (lson instanceof LiveObject) {
    const data: Record<string, PlainLson> = {};
    for (const key of lson.keys()) {
      const value = lson.get(key);
      if (value !== undefined) {
        data[key] = toPlainLson(value);
      }
    }
    return { liveblocksType: "LiveObject", data };
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
