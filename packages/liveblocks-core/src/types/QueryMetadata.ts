import type { BaseMetadata } from "./BaseMetadata";

type QueryMetadataStringValue<T extends string> =
  | T
  | {
      operator: "startsWith";
      value: string;
    };

/**
 * This type can be used to build a metadata query string (compatible
 * with `@liveblocks/query-parser`) through a type-safe API.
 *
 * In addition to exact values (`:` in query string), it adds:
 * - to strings:
 *  - `startsWith` (`^` in query string)
 */
export type QueryMetadata<T extends BaseMetadata> = {
  [K in keyof T]: T[K] extends string ? QueryMetadataStringValue<T[K]> : T[K];
};
