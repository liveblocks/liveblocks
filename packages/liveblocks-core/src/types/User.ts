import type { JsonObject } from "../lib/Json";
import type { BaseUserMeta } from "../protocol/BaseUserMeta";

/**
 * Represents a user connected in a room. Treated as immutable.
 */
export type User<
  TPresence extends JsonObject,
  TUserMeta extends BaseUserMeta
> = {
  /**
   * The connection id of the user. It is unique and increment at every new connection.
   */
  readonly connectionId: number;
  /**
   * The id of the user that has been set in the authentication endpoint.
   * Useful to get additional information about the connected user.
   */
  readonly id: TUserMeta["id"];
  /**
   * Additional user information that has been set in the authentication endpoint.
   */
  readonly info: TUserMeta["info"];
  /**
   * The user presence.
   */
  readonly presence: TPresence;

  /**
   * @deprecated Use `!user.canWrite` instead.
   * False if the user can mutate the Room’s Storage and/or YDoc, true if they
   * can only read but not mutate it.
   */
  readonly isReadOnly: boolean;

  /**
   * True if the user can mutate the Room’s Storage and/or YDoc, false if they
   * can only read but not mutate it.
   */
  readonly canWrite: boolean;
};
