import type { Json } from "./Json";

export type BaseUserMeta = {
  /**
   * The id of the user that has been set in the authentication endpoint.
   * Useful to get additional information about the connected user.
   */
  id?: string;

  /**
   * Additional user information that has been set in the authentication endpoint.
   */
  info?: Json;
};
