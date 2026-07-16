import type { Json, JsonObject } from "../lib/Json";

export type JsonTreeNode = {
  readonly type: "Json";
  readonly id: string;
  readonly key: string;
  readonly payload: Json;
};

export type LiveTreeNode<TName extends `Live${string}` = `Live${string}`> = {
  readonly type: TName;
  readonly id: string;
  readonly key: string;
  readonly payload: LsonTreeNode[];
};

export type LsonTreeNode = LiveTreeNode | JsonTreeNode;

export type UserTreeNode = {
  readonly type: "User";
  readonly id: string;
  readonly key: string;
  readonly payload: {
    //
    // NOTE:
    // It may be tempting to DRY this up with the User type. But here, this
    // type is used for the DevTools messaging protocol, which should not
    // automatically change unintentionally. Adding, changing, or removing
    // fields from the User type should be done deliberately, and potentially
    // versioned.
    //
    // In other words, this type should remain to be a union of all historic
    // User types.
    //
    readonly connectionId: number;
    readonly id?: string;
    readonly info?: Json;
    readonly presence: JsonObject;
    readonly isReadOnly: boolean;
  };
};

// Almost a JsonTreeNode, but contains the connectionId (sender) as extra
// metadata
export type CustomEventTreeNode = {
  readonly type: "CustomEvent";
  readonly id: string;
  readonly key: string;
  readonly connectionId: number;
  readonly payload: Json;
};

export type TreeNode = LsonTreeNode | UserTreeNode | CustomEventTreeNode;
