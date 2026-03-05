export type PresenceStates = "playing" | "seeking" | "paused";

declare global {
  interface Liveblocks {
    // Each user's Presence, for room.getPresence, room.subscribe("others"), etc.
    Presence: {
      state: PresenceStates;
      time: number;
    };
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: {
        name: string;
        color: string;
        avatar: string;
      }; // Accessible through `user.info`
    };
    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: {
      time: number | -1;
      timePercentage: number | -1;
    };
    // Custom metadata set on comments, for useCreateComment, useEditCommentMetadata, etc.
    CommentMetadata: {
      spoiler?: boolean;
    };
  }
}
