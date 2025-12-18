import type { BaseMetadata, CommentBody } from "@liveblocks/core";

export class CreateThreadError<TM extends BaseMetadata> extends Error {
  constructor(
    public cause: Error,
    public context: {
      roomId: string;
      threadId: string;
      commentId: string;
      body: CommentBody;
      metadata: TM;
    }
  ) {
    super("Create thread failed.");
    this.name = "CreateThreadError";
  }
}

export class EditThreadMetadataError<TM extends BaseMetadata> extends Error {
  constructor(
    public cause: Error,
    public context: {
      roomId: string;
      threadId: string;
      metadata: Partial<TM>;
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

export type CommentsError<TM extends BaseMetadata> =
  | CreateThreadError<TM>
  | EditThreadMetadataError<TM>
  | CreateCommentError
  | EditCommentError
  | DeleteCommentError;
