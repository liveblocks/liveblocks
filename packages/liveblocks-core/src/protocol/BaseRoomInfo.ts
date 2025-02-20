import type { Json } from "../lib/Json.js";

export type BaseRoomInfo = {
  [key: string]: Json | undefined;

  /**
   * The name of the room.
   */
  name?: string;

  /**
   * The URL of the room.
   */
  url?: string;
};
