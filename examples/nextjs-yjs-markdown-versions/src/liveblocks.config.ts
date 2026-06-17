export type UserInfo = {
  name: string;
  color: string;
  picture: string;
};

export type UserAwareness = {
  user?: UserInfo;
};

export type AwarenessList = [number, UserAwareness][];

declare global {
  interface Liveblocks {
    UserMeta: {
      id: string;
      info: UserInfo;
    };
    RoomInfo: {
      title: string;
      ownerName: string;
    };
  }
}
