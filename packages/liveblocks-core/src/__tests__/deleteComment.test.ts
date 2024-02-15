import { deleteComment } from "../store";
import { createComment, createThread } from "./_dummies";

describe("deleteComment", () => {
  it("should mark a comment as deleted in a thread", () => {
    const comment = createComment({ createdAt: new Date("2024-01-01") });

    const thread = createThread({
      id: comment.threadId,
      roomId: comment.roomId,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      comments: [createComment(), comment],
    });

    const deletedAt = new Date("2024-01-02");

    const updatedThread = deleteComment(thread, comment.id, deletedAt);

    expect(updatedThread.updatedAt).toEqual(deletedAt);
    const updatedComment = updatedThread.comments.find(
      (c) => c.id === comment.id
    );
    expect(updatedComment).toBeDefined();
    if (updatedComment === undefined) return;
    expect(updatedComment.deletedAt).toEqual(deletedAt);
    expect(updatedComment.body).toBeUndefined();
  });

  it("should not delete a comment from a deleted thread", () => {
    const comment = createComment({ createdAt: new Date("2024-01-01") });

    const thread = createThread({
      id: comment.threadId,
      roomId: comment.roomId,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      deletedAt: new Date("2024-01-02"),
      comments: [comment],
    });

    const updatedThread = deleteComment(
      thread,
      comment.id,
      new Date("2024-01-03")
    );

    expect(updatedThread).toEqual(thread);
  });

  it("should not delete a comment that does not exist", () => {
    const thread = createThread({
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      comments: [createComment()],
    });

    expect(thread.comments.length).toBe(1);

    const updatedThread = deleteComment(
      thread,
      "comment_id",
      new Date("2024-01-02")
    );

    expect(updatedThread).toEqual(thread);
    expect(updatedThread.comments.length).toBe(1);
  });

  it("should not delete an already deleted comment", () => {
    const comment = createComment({
      createdAt: new Date("2024-01-01"),
      deletedAt: new Date("2024-01-02"),
    });

    const thread = createThread({
      id: comment.threadId,
      roomId: comment.roomId,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      deletedAt: new Date("2024-01-02"),
      comments: [comment],
    });

    const updatedThread = deleteComment(
      thread,
      comment.id,
      new Date("2024-01-03")
    );

    expect(updatedThread.comments[0].deletedAt).toEqual(comment.deletedAt); // Ensure the original deletion time is preserved
    expect(updatedThread.updatedAt).toEqual(thread.updatedAt); // The thread's updatedAt should not change
  });

  it("should update the thread's updatedAt when deleting the last comment", () => {
    const comment = createComment({
      createdAt: new Date("2024-01-01"),
      deletedAt: new Date("2024-01-02"),
    });

    const thread = createThread({
      id: comment.threadId,
      roomId: comment.roomId,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      comments: [comment],
    });

    const deletedAt = new Date("2024-01-03");
    const updatedThread = deleteComment(thread, comment.id, deletedAt);
    expect(updatedThread.updatedAt).toEqual(deletedAt); // The thread's updatedAt should reflect the deletion time
  });
});
