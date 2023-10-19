import type { JsonObject } from "../lib/Json";
import type { Resolve } from "../lib/Resolve";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";
import type { User } from "./User";

/**
 * @deprecated Use `readonly User<TPresence, TUserMeta>[]` instead of `Others<TPresence, TUserMeta>`.
 */
export type Others<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta,
> = readonly User<TPresence, TUserMeta>[];

export type InternalOthersEvent<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta,
> =
  | { type: "leave"; user: User<TPresence, TUserMeta> }
  | { type: "enter"; user: User<TPresence, TUserMeta> }
  | {
      type: "update";
      user: User<TPresence, TUserMeta>;
      updates: Partial<TPresence>;
    }
  | { type: "reset" };

// XXX Rename this to OthersEvent eventually again
export type NewStyleOthersEvent<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta,
> = Resolve<
  InternalOthersEvent<TPresence, TUserMeta> & {
    others: readonly User<TPresence, TUserMeta>[];
  }
>;

//
// NOTE:
// This type looks an awful lot like InternalOthersEvent, but don't change this
// type definition or DRY this up!
// The type LegacyOthersEvent is used in the signature of some public APIs, and
// as such should remain backward compatible.
//
// XXX Probably better to codify this knowledge as a tsd test instead!
//
export type LegacyOthersEvent<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta,
> =
  | { type: "leave"; user: User<TPresence, TUserMeta> }
  | { type: "enter"; user: User<TPresence, TUserMeta> }
  | {
      type: "update";
      user: User<TPresence, TUserMeta>;
      updates: Partial<TPresence>;
    }
  | { type: "reset" };
