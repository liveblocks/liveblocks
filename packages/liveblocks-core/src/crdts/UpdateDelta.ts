import type { Lson } from "./Lson";

export type UpdateDelta =
  | { type: "update" }
  | { type: "delete"; deletedItem: Lson };
