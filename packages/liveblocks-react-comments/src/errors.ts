import type { BaseMetadata, CommentBody } from "@liveblocks/core";

export class CreateThreadError<TMetadata extends BaseMetadata> extends Error {
  constructor(
    public cause: Error,
    public context: {
      roomId: string;
      threadId: string;
      commentId: string;
      body: CommentBody;
      metadata: TMetadata;
    }
  ) {
    super("Create thread failed.");
    this.name = "CreateThreadError";
  }
}

export class EditThreadMetadataError<
  TMetadata extends BaseMetadata,
> extends Error {
  constructor(
    public cause: Error,
    public context: {
      roomId: string;
      threadId: string;
      metadata: Partial<TMetadata>;
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

export type CommentsError<TThreadMetadata extends BaseMetadata> =
  | CreateThreadError<TThreadMetadata>
  | EditThreadMetadataError<TThreadMetadata>
  | CreateCommentError
  | EditCommentError
  | DeleteCommentError;
