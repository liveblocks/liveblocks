import type { JsonObject } from "../lib/Json";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type { User } from "./User";

/**
 * @deprecated Use `readonly User<TPresence, TUserMeta>[]` instead of `Others<TPresence, TUserMeta>`.
 * Represents all the other users connected in the room. Treated as immutable.
 */
export type Others<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta,
> = readonly User<TPresence, TUserMeta>[];

export type OthersEvent<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta,
> =
  | {
      type: "leave";
      user: User<TPresence, TUserMeta>;
    }
  | {
      type: "enter";
      user: User<TPresence, TUserMeta>;
    }
  | {
      type: "update";
      user: User<TPresence, TUserMeta>;
      updates: Partial<TPresence>;
    }
  | {
      type: "reset";
    };
