export type UserMeta = {
  id: string;
  info: {
    name: string;
    color: string;
    avatar: string;
  };
};

export type RoomInfo = {
  title: string;
  description: string;
};

declare global {
  interface Liveblocks {
    UserMeta: UserMeta;
    RoomInfo: RoomInfo;
  }
}
