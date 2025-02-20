import type { DP, DU } from "../globals/augmentation.js";
import type { JsonObject } from "../lib/Json.js";
import type { Relax } from "../lib/Relax.js";
import type { Resolve } from "../lib/Resolve.js";
import type { BaseUserMeta } from "../protocol/BaseUserMeta.js";
import type { User } from "./User.js";

export type InternalOthersEvent<
  P extends JsonObject,
  U extends BaseUserMeta,
> = Relax<
  | { type: "leave"; user: User<P, U> }
  | { type: "enter"; user: User<P, U> }
  | {
      type: "update";
      user: User<P, U>;
      updates: Partial<P>;
    }
  | { type: "reset" }
>;

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
