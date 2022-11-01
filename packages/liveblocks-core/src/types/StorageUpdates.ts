import type { LiveList } from "../crdts/LiveList";
import type { LiveMap } from "../crdts/LiveMap";
import type { LiveObject } from "../crdts/LiveObject";
import type { Lson, LsonObject } from "../crdts/Lson";

export type UpdateDelta =
  | {
      type: "update";
    }
  | {
      type: "delete";
    };

/**
 * A LiveMap notification that is sent in-client to any subscribers whenever
 * one or more of the values inside the LiveMap instance have changed.
 */
export type LiveMapUpdates<TKey extends string, TValue extends Lson> = {
  type: "LiveMap";
  node: LiveMap<TKey, TValue>;
  updates: { [key: string]: UpdateDelta };
  //               ^^^^^^
  //               FIXME: `string` is not specific enough here. See if we can
  //               improve this type to match TKey!
};

export type LiveObjectUpdateDelta<O extends { [key: string]: unknown }> = {
  [K in keyof O]?: UpdateDelta | undefined;
};

/**
 * A LiveObject notification that is sent in-client to any subscribers whenever
 * one or more of the entries inside the LiveObject instance have changed.
 */
export type LiveObjectUpdates<TData extends LsonObject> = {
  type: "LiveObject";
  node: LiveObject<TData>;
  updates: LiveObjectUpdateDelta<TData>;
};

export type LiveListUpdateDelta =
  | {
      index: number;
      item: Lson;
      type: "insert";
    }
  | {
      index: number;
      type: "delete";
    }
  | {
      index: number;
      previousIndex: number;
      item: Lson;
      type: "move";
    }
  | {
      index: number;
      item: Lson;
      type: "set";
    };

/**
 * A LiveList notification that is sent in-client to any subscribers whenever
 * one or more of the items inside the LiveList instance have changed.
 */
export type LiveListUpdates<TItem extends Lson> = {
  type: "LiveList";
  node: LiveList<TItem>;
  updates: LiveListUpdateDelta[];
};

export type StorageCallback = (updates: StorageUpdate[]) => void;

/**
 * The payload of notifications sent (in-client) when LiveStructures change.
 * Messages of this kind are not originating from the network, but are 100%
 * in-client.
 */
export type StorageUpdate =
  | LiveMapUpdates<string, Lson>
  | LiveObjectUpdates<LsonObject>
  | LiveListUpdates<Lson>;
