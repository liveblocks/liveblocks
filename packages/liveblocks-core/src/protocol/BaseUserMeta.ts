import type { Json } from "../lib/Json";

/**
 * Represents some constraints for user info. Basically read this as: "any JSON
 * object is fine, but _if_ it has a name field, it _must_ be a string."
 * (Ditto for avatar.)
 */
export type IUserInfo = {
  [key: string]: Json | undefined;
  name?: string;
  avatar?: string;
};

/**
 * This type is used by clients to define the metadata for a user.
 */
export type BaseUserMeta = {
  /**
   * The id of the user that has been set in the authentication endpoint.
   * Useful to get additional information about the connected user.
   */
  id?: string;

  /**
   * Additional user information that has been set in the authentication endpoint.
   */
  info?: IUserInfo;
};
