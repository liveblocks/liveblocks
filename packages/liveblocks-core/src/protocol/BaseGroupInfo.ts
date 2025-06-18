import type { Json } from "../lib/Json";

export type BaseGroupInfo = {
  [key: string]: Json | undefined;

  /**
   * The name of the group.
   */
  name?: string;

  /**
   * The avatar of the group.
   */
  avatar?: string;
};
