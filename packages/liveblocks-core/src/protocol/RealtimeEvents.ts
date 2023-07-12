type BaseThreadRealtimeEvent = {
  roomId: string;
  threadId: string;
};

type BaseCommentRealtimeEvent = BaseThreadRealtimeEvent & {
  commentId: string;
};

export type ThreadCreatedRealtimeEvent = BaseThreadRealtimeEvent & {
  type: "threadCreated";
};

export type ThreadUpdatedRealtimeEvent = BaseThreadRealtimeEvent & {
  type: "threadUpdated";
};

export type ThreadDeletedRealtimeEvent = BaseThreadRealtimeEvent & {
  type: "threadDeleted";
};

export type CommentCreatedRealtimeEvent = BaseCommentRealtimeEvent & {
  type: "commentCreated";
};

export type CommentUpdatedRealtimeEvent = BaseCommentRealtimeEvent & {
  type: "commentEdited";
};

export type CommentDeletedRealtimeEvent = BaseCommentRealtimeEvent & {
  type: "commentDeleted";
};

export type RealtimeEvent =
  | ThreadCreatedRealtimeEvent
  | ThreadUpdatedRealtimeEvent
  | ThreadDeletedRealtimeEvent
  | CommentCreatedRealtimeEvent
  | CommentUpdatedRealtimeEvent
  | CommentDeletedRealtimeEvent;

export type RealtimeEventTypes = RealtimeEvent["type"];
