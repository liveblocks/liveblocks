/* eslint-disable eqeqeq */
import type * as Y from "yjs";

type YJsonExport =
  | {
      [x: string]: unknown;
    }
  | string
  | undefined
  | unknown[]
  | unknown;

/*
  Unfortunately, there's no good way to know what type of object we have inside a ydoc,
  Yjs relies on users calling `get("someKey", sometype)` or a type specific method like `getText`
  to know the type. Therefore we must add a pretty hacky method to attempt to infer the type.
  Without using one of those methods, calling `toJSON()` will just return YAbstractType's 
  `toJson` which simply returns {}. 
*/
function getYTypedValue(
  doc: Y.Doc,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: Y.AbstractType<Y.YEvent<any>>,
  key: string
): YJsonExport {
  // NOTE: We may need a recusrive check for map/arrays to get nested values.
  // As the main usecase is text, for now we won't worry about it
  switch (true) {
    case value._map instanceof Map && value._map.size > 0:
      return doc.getMap(key).toJSON();
    case value._start != null && "arr" in value._start.content:
      return doc.getArray(key).toJSON() as unknown[];
    case value._start != null && "str" in value._start.content:
      return doc.getText(key).toJSON();
    case value._start != null && "type" in value._start.content:
      return doc.getXmlFragment(key).toJSON();
  }
  return value.toJSON() as unknown;
}

/*
Returns the JSON representation of the values within the doc. 
*/
export function yDocToJson(doc: Y.Doc): Record<string, YJsonExport> {
  const result: Record<string, YJsonExport> = {};
  for (const [key, value] of doc.share) {
    result[key] = getYTypedValue(doc, value, key);
  }
  return result;
}
