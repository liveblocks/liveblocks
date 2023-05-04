import type { PlainLsonObject } from "@liveblocks/core";
import { prettify } from "@liveblocks/schema";

import { inferStorageType } from "./inference";
import { buildSchema, inferredSchemaToAst } from "./schema";

export function inferSchema(storageValue: PlainLsonObject): string {
  const storageType = inferStorageType(storageValue);
  const schema = buildSchema(storageType);
  const ast = inferredSchemaToAst(schema);
  return prettify(ast);
}
