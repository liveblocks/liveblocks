import type { BaseMetadata, CommentBody, Patchable } from "@liveblocks/core";

/**
 * @private Internal API, do not rely on it.
 */
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

/**
 * @private Internal API, do not rely on it.
 */
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

/**
 * @private Internal API, do not rely on it.
 */
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

/**
 * @private Internal API, do not rely on it.
 */
export class MarkThreadAsResolvedError extends Error {
  constructor(
    public cause: Error,
    public context: {
      roomId: string;
      threadId: string;
    }
  ) {
    super("Mark thread as resolved failed.");
    this.name = "MarkThreadAsResolvedError";
  }
}

/**
 * @private Internal API, do not rely on it.
 */
export class MarkThreadAsUnresolvedError extends Error {
  constructor(
    public cause: Error,
    public context: {
      roomId: string;
      threadId: string;
    }
  ) {
    super("Mark thread as unresolved failed.");
    this.name = "MarkThreadAsUnresolvedError";
  }
}

/**
 * @private Internal API, do not rely on it.
 */
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

/**
 * @private Internal API, do not rely on it.
 */
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

/**
 * @private Internal API, do not rely on it.
 */
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

/**
 * @private Internal API, do not rely on it.
 */
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

/**
 * @private Internal API, do not rely on it.
 */
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

/**
 * @private Internal API, do not rely on it.
 */
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

/**
 * @private Internal API, do not rely on it.
 */
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

/**
 * @private Internal API, do not rely on it.
 */
export type CommentsError<M extends BaseMetadata> =
  | CreateThreadError<M>
  | EditThreadMetadataError<M>
  | CreateCommentError
  | EditCommentError
  | DeleteCommentError
  | MarkInboxNotificationAsReadError
  | UpdateNotificationSettingsError;
