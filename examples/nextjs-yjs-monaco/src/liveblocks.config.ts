type UserInfo = {
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
    // Optionally, UserMeta represents static/readonly metadata on each user, as
    // provided by your own custom auth back end (if used). Useful for data that
    // will not change during a session, like a user's name or avatar.
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: UserInfo; // Accessible through `user.info`
    };
  }
}
