import type { BaseMetadata, CommentBody } from "@liveblocks/core";

type PartialNullable<T> = {
  [P in keyof T]?: T[P] | null | undefined;
};

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
      metadata: PartialNullable<TMetadata>;
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

export type CommentsError<TThreadMetadata extends BaseMetadata> =
  | CreateThreadError<TThreadMetadata>
  | EditThreadMetadataError<TThreadMetadata>
  | CreateCommentError
  | EditCommentError
  | DeleteCommentError;
