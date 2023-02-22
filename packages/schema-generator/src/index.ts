import { prettify } from "@liveblocks/schema";

import { inferStorageType } from "./inference";
import type { PlainLsonObject } from "./plainLson";
import { inferredSchemaToAst, inferSchema } from "./schema";

export type {
  Json,
  JsonObject,
  JsonScalar,
  PlainLsonList,
  PlainLsonMap,
  PlainLsonObject,
} from "./plainLson";

export function inferPlainLsonSchema(storageValue: PlainLsonObject): string {
  const storageType = inferStorageType(storageValue);
  const schema = inferSchema(storageType);
  const ast = inferredSchemaToAst(schema);
  return prettify(ast);
}
