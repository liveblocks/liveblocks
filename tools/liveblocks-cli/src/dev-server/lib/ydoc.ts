/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type { Json } from "@liveblocks/core";
import * as Y from "yjs";

// Helper functions for Yjs document conversion (copied from apps/cloudflare/src/utils/index.ts)
type YType = "unknown" | "text" | "array" | "xml";

function getType(item: Y.Item): YType {
  if (
    item.content instanceof Y.ContentFormat ||
    item.content instanceof Y.ContentEmbed
  ) {
    return "text";
  }
  if ("arr" in item.content) return "array";
  if ("str" in item.content) return "text";
  if ("type" in item.content) return "xml";
  return "unknown";
}

function getFormattedText(value: Y.Item): Json[] {
  const formatted: Json[] = [];
  let n: Y.Item | null = value;
  while (n !== null) {
    if (!n.deleted) {
      if (n.content instanceof Y.ContentType) {
        formatted.push(n.content.type.toJSON() as Json);
      } else if (n.content instanceof Y.ContentString) {
        formatted.push(n.content.str);
      } else if (n.content instanceof Y.ContentFormat) {
        const { key, value: formatValue } = n.content;
        formatted.push({
          key,
          value: formatValue as Record<string, Json>,
        });
      } else if (n.content instanceof Y.ContentEmbed) {
        formatted.push(n.content.embed as Record<string, Json>);
      }
    }
    n = n.right;
  }
  return formatted;
}

function getYTypedValue(
  doc: Y.Doc,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: Y.AbstractType<Y.YEvent<any>>,
  key: string,
  includeFormatting = false
): Json {
  if (!value._first && value._map instanceof Map && value._map.size > 0) {
    return doc.getMap(key).toJSON() as Json;
  } else if (value._first !== null) {
    const type = getType(value._first);
    if (type === "text") {
      return includeFormatting
        ? getFormattedText(value._first)
        : doc.getText(key).toJSON();
    } else if (type === "array") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return doc.getArray(key).toJSON();
    } else if (type === "xml") {
      return doc.getXmlFragment(key).toJSON();
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  return value.toJSON();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConstructorType = new () => Y.AbstractType<any>;

const YTYPES: Record<string, ConstructorType | undefined> = {
  ytext: Y.Text,
  yxmlfragment: Y.XmlFragment,
  yxmltext: Y.XmlText,
  ymap: Y.Map,
  yarray: Y.Array,
};

/*
Returns the JSON representation of the values within the doc. 
*/
export function yDocToJson(
  doc: Y.Doc,
  key: string = "",
  formatting: boolean = false,
  type: string = ""
): Record<string, Json> {
  const result: Record<string, Json> = {};
  if (key.length) {
    if (doc.share.has(key)) {
      if (type.length) {
        const ytypefn = YTYPES[type];
        if (ytypefn) {
          const val = doc.get(key, ytypefn);
          return val.toJSON() as Record<string, Json>;
        }
      }
      return {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        [key]: getYTypedValue(doc, doc.share.get(key)!, key, formatting),
      };
    }
    return { [key]: "" };
  }

  for (const [key, value] of doc.share) {
    result[key] = getYTypedValue(doc, value, key, formatting);
  }
  return result;
}
