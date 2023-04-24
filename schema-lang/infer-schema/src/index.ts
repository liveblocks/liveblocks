import { prettify } from "@liveblocks/schema";

import { inferStorageType } from "./inference";
import type { PlainLsonObject } from "./plainLson";
import { buildSchema, inferredSchemaToAst } from "./schema";

export type {
  Json,
  JsonObject,
  JsonScalar,
  PlainLsonList,
  PlainLsonMap,
  PlainLsonObject,
} from "./plainLson";

export function inferSchema(storageValue: PlainLsonObject): string {
  const storageType = inferStorageType(storageValue);
  const schema = buildSchema(storageType);
  const ast = inferredSchemaToAst(schema);
  return prettify(ast);
}
