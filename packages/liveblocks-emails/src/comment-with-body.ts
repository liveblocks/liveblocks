import type { CommentBody, CommentData } from "@liveblocks/core";

export type CommentDataWithBody = Omit<CommentData, "body" | "deletedAt"> & {
  body: CommentBody;
  deletedAt?: never;
};

const isCommentDataWithBody = (
  comment: CommentData
): comment is CommentDataWithBody => {
  return comment.body !== undefined && comment.deletedAt === undefined;
};

export function filterCommentsWithBody(
  comments: CommentData[]
): CommentDataWithBody[] {
  const commentsWithBody: CommentDataWithBody[] = [];
  for (const comment of comments) {
    if (isCommentDataWithBody(comment)) {
      commentsWithBody.push(comment);
    }
  }
  return commentsWithBody;
}
