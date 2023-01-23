import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";

export type Presence = {
  selectedCell: string | null;
};

export type Colors = {
  colors: LiveObject<{[key: string] : string}>
}
export type Storage = {
  colors: Colors;
};

export type UserInfo = {
  color: string;
  name: string;
  url: string;
};

export type UserMeta = {
  id: string;
  info: UserInfo;
};
