import type { JsonObject } from "../lib/Json";
import type { ReadonlyArrayWithLegacyMethods } from "../lib/LegacyArray";
import type { BaseUserMeta } from "./BaseUserMeta";
import type { User } from "./User";

/**
 * Represents all the other users connected in the room. Treated as immutable.
 */
export type Others<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta
> = ReadonlyArrayWithLegacyMethods<User<TPresence, TUserMeta>>;

export type OthersEvent<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta
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
