import type { DP, DU } from "../globals/augmentation";
import type { JsonObject } from "../lib/Json";
import type { Resolve } from "../lib/Resolve";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type { User } from "./User";

export type InternalOthersEvent<P extends JsonObject, U extends BaseUserMeta> =
  | { type: "leave"; user: User<P, U> }
  | { type: "enter"; user: User<P, U> }
  | {
      type: "update";
      user: User<P, U>;
      updates: Partial<P>;
    }
  | { type: "reset"; user?: never };

export type OthersEvent<
  P extends JsonObject = DP,
  U extends BaseUserMeta = DU,
> = Resolve<
  InternalOthersEvent<P, U> & {
    others: readonly User<P, U>[];
  }
>;

export enum TextEditorType {
  Lexical = "lexical",
  TipTap = "tiptap",
}
