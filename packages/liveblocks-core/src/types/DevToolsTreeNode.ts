import type { Json, JsonObject } from "../lib/Json";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type { User } from "../types/User";

// XXX Get rid of type params here - this is all dynamic/runtime data, so they should not be needed?
export type JsonTreeNode<TKey = string | number, TValue = Json> = {
  type: "Json";
  id: string;
  key: TKey;
  value: TValue;
};

// XXX Get rid of this type?
export type ObjectTreeNode<K = string | number> = {
  type: "Object";
  id: string;
  key: K;
  fields: PrimitiveTreeNode[];
};

export type UserTreeNode<
  TUser extends User<JsonObject, BaseUserMeta> = User<JsonObject, BaseUserMeta>
> = {
  type: "User";
  id: string;
  key: number | string;
  isReadOnly: boolean;

  // XXX Restore info and presence fields?
  fields: PrimitiveTreeNode<keyof TUser>[];
};

export type LiveMapTreeNode = {
  type: "LiveMap";
  id: string;
  key: number | string;
  entries: StorageTreeNode[];
};

export type LiveListTreeNode = {
  type: "LiveList";
  id: string;
  key: number | string;
  items: StorageTreeNode[];
};

export type LiveObjectTreeNode = {
  type: "LiveObject";
  id: string;
  key: number | string;
  fields: StorageTreeNode[];
};

// XXX Get rid of this type?
export type PrimitiveTreeNode<TKey = string | number> =
  | ObjectTreeNode<TKey>
  | JsonTreeNode<TKey>;

export type StorageTreeNode =
  | LiveMapTreeNode
  | LiveListTreeNode
  | LiveObjectTreeNode
  | PrimitiveTreeNode;

export type TreeNode = StorageTreeNode | UserTreeNode;
