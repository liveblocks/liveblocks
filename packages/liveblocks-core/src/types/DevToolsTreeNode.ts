import type { Json, JsonObject } from "../lib/Json";

/**
 * Envelope-like wrapper around data that will get visualized in the DevTools.
 */
// XXX I don't like the name Wrap and want to reserve the name TreeNode for the
// XXX the union of all tree node types (see below).
// XXX What to do?
export type Wrap<TName extends string, TPayload extends Json> = {
  /** Used by the DevTools UI to determine how to visualize the payload. */
  readonly type: TName;

  /** Used by DevTools panel to track nodes */
  readonly id: string;

  /** Label that will show up for each row in DevTools */
  readonly key: string;

  /** Payload that's relevant for this type */
  readonly payload: TPayload;
};

export type LsonTreeNode =
  | Wrap<`Live${string}`, LsonTreeNode[]> // Allows for future-compatibility of Live types
  | Wrap<"Json", Json>;

export type UserTreeNode = Wrap<
  "User",
  {
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
  }
>;

export type TreeNode = LsonTreeNode | UserTreeNode;
