import type { BaseMetadata, CommentBody, Patchable } from "@liveblocks/core";

export class CreateThreadError<M extends BaseMetadata> extends Error {
  constructor(
    public cause: Error,
    public context: {
      roomId: string;
      threadId: string;
      commentId: string;
      body: CommentBody;
      metadata: M;
    }
  ) {
    super("Create thread failed.");
    this.name = "CreateThreadError";
  }
}

export class DeleteThreadError extends Error {
  constructor(
    public cause: Error,
    public context: {
      roomId: string;
      threadId: string;
    }
  ) {
    super("Delete thread failed.");
    this.name = "DeleteThreadError";
  }
}

export class EditThreadMetadataError<M extends BaseMetadata> extends Error {
  constructor(
    public cause: Error,
    public context: {
      roomId: string;
      threadId: string;
      metadata: Patchable<M>;
    }
  ) {
    super("Edit thread metadata failed.");
    this.name = "EditThreadMetadataError";
  }
}

export class CreateCommentError extends Error {
  constructor(
    public cause: Error,
    public context: {
      roomId: string;
      threadId: string;
      commentId: string;
      body: CommentBody;
    }
  ) {
    super("Create comment failed.");
    this.name = "CreateCommentError";
  }
}

export class EditCommentError extends Error {
  constructor(
    public cause: Error,
    public context: {
      roomId: string;
      threadId: string;
      commentId: string;
      body: CommentBody;
    }
  ) {
    super("Edit comment failed.");
    this.name = "EditCommentError";
  }
}

export class DeleteCommentError extends Error {
  constructor(
    public cause: Error,
    public context: {
      roomId: string;
      threadId: string;
      commentId: string;
    }
  ) {
    super("Delete comment failed.");
    this.name = "DeleteCommentError";
  }
}

export class AddReactionError extends Error {
  constructor(
    public cause: Error,
    public context: {
      roomId: string;
      threadId: string;
      commentId: string;
      emoji: string;
    }
  ) {
    super("Add reaction failed.");
    this.name = "AddReactionError";
  }
}

export class RemoveReactionError extends Error {
  constructor(
    public cause: Error,
    public context: {
      roomId: string;
      threadId: string;
      commentId: string;
      emoji: string;
    }
  ) {
    super("Remove reaction failed.");
    this.name = "RemoveReactionError";
  }
}

export class MarkInboxNotificationAsReadError extends Error {
  constructor(
    public cause: Error,
    public context: {
      inboxNotificationId: string;
    }
  ) {
    super("Mark inbox notification as read failed.");
    this.name = "MarkInboxNotificationAsReadError";
  }
}

export class UpdateNotificationSettingsError extends Error {
  constructor(
    public cause: Error,
    public context: {
      roomId: string;
    }
  ) {
    super("Update notification settings failed.");
    this.name = "UpdateNotificationSettingsError";
  }
}

export type CommentsError<M extends BaseMetadata> =
  | CreateThreadError<M>
  | EditThreadMetadataError<M>
  | CreateCommentError
  | EditCommentError
  | DeleteCommentError
  | MarkInboxNotificationAsReadError
  | UpdateNotificationSettingsError;
