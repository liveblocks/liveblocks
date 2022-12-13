/**
 * This module defines data types that are used to serialize the storage and
 * presence trees for displaying in the Liveblocks browser extension.
 */

import type { Json, JsonObject } from "../lib/Json";
import type { User } from "../types/User";
import type { BaseUserMeta } from "./BaseUserMeta";

export type JsonTreeNode<TKey = string | number, TValue = Json> = {
  type: "Json";
  id: string;
  key: TKey;
  value: TValue;
};

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

export type PrimitiveTreeNode<TKey = string | number> =
  | ObjectTreeNode<TKey>
  | JsonTreeNode<TKey>;

export type StorageTreeNode =
  | LiveMapTreeNode
  | LiveListTreeNode
  | LiveObjectTreeNode
  | PrimitiveTreeNode;

export type TreeNode = StorageTreeNode | UserTreeNode;
