import type { LsonObject } from "../crdts/Lson";

/**
 * A frozen-in-time snapshot of a room's Storage or Yjs data.
 */
export type Version = {
  id: `vh_${string}`;
  createdAt: Date;
  /** The user IDs that have mutated any Storage or Yjs since the last version. */
  authors: { id: string }[];
  data:
    | { yjs: Uint8Array; storage?: LsonObject }
    | { yjs?: Uint8Array; storage: LsonObject };
};

/**
 * A frozen-in-time snapshot of a room's Storage or Yjs data.
 *
 * Metadata for a single version of a room, as returned by the version history
 *
 * list. A version is a snapshot of the whole room at a point in time; its
 * contents are fetched separately.
 */
// XXX VersionRef? Or VersionInfo?
export type VersionRef = Omit<Version, "data">;

/**
 * @deprecated Use {@link VersionRef} instead. A version is now a snapshot of
 * the whole room rather than just its Yjs document, so the `kind`
 * discriminator is gone from the public surface. This type will be removed in
 * a future version.
 */
export type HistoryVersion = {
  type: "historyVersion";
  kind: "yjs";
  createdAt: Date;
  id: string;
  authors: { id: string }[];
};
