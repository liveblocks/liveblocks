import { describe, expect, test } from "vitest";

import { applyUpsertComment } from "../../umbrella-store";
import { createComment, createThread } from "./_dummies";

describe("upsertComment", () => {
  test("should add a new comment to an empty thread", () => {
    const thread = createThread({
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    });

    const comment = createComment({
      threadId: thread.id,
      roomId: thread.roomId,
      createdAt: new Date("2024-01-03"),
    });

    const updatedThread = applyUpsertComment(thread, comment);
    expect(updatedThread.comments).toContainEqual(comment);
    expect(updatedThread.updatedAt).toEqual(comment.createdAt);
  });

  test("should add a new comment to a thread with existing comments", () => {
    const thread = createThread({
      comments: [createComment(), createComment()],
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    });
    const comment = createComment({
      threadId: thread.id,
      roomId: thread.roomId,
      createdAt: new Date("2024-01-03"),
    });

    const updatedThread = applyUpsertComment(thread, comment);
    expect(updatedThread.comments).toContainEqual(comment);
    expect(updatedThread.updatedAt).toEqual(comment.createdAt);
  });

  test("should update an existing comment", () => {
    const comment = createComment({ createdAt: new Date("2024-01-01") });
    const thread = createThread({
      id: comment.threadId,
      roomId: comment.roomId,
      comments: [comment],
      createdAt: new Date("2023-12-31"),
    });

    const updatedComment = createComment({
      id: comment.id,
      threadId: comment.threadId,
      roomId: comment.roomId,
      body: {
        version: 1,
        content: [{ type: "paragraph", children: [{ text: "Updated" }] }],
      },
      createdAt: new Date("2024-01-01"),
      editedAt: new Date("2024-01-02"),
    });

    const updatedThread = applyUpsertComment(thread, updatedComment);
    expect(updatedThread.comments).toContainEqual(updatedComment);
    expect(updatedThread.comments).not.toContainEqual(comment);
    expect(updatedThread.createdAt).toEqual(new Date("2023-12-31"));
    expect(updatedThread.updatedAt).toEqual(new Date("2024-01-02"));
  });

  test("should not update an existing comment if the new comment is older", () => {
    const comment = createComment({
      createdAt: new Date("2024-01-01"),
      editedAt: new Date("2024-01-03"),
    });
    const thread = createThread({
      id: comment.threadId,
      roomId: comment.roomId,
      comments: [comment],
      updatedAt: new Date("2024-01-03"),
    });

    const updatedComment = createComment({
      id: comment.id,
      threadId: comment.threadId,
      roomId: comment.roomId,
      body: {
        version: 1,
        content: [{ type: "paragraph", children: [{ text: "Updated" }] }],
      },
      editedAt: new Date("2024-01-02"),
    });

    const updatedThread = applyUpsertComment(thread, updatedComment);
    expect(updatedThread.comments).not.toContainEqual(updatedComment);
    expect(updatedThread.comments).toContainEqual(comment);
    expect(updatedThread.updatedAt).toBe(thread.updatedAt);
  });

  test("should add a new comment if the thread has been updatedAt more recently than the comment creation date", () => {
    const thread = createThread({
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-03"),
    });
    const comment = createComment({
      threadId: thread.id,
      roomId: thread.roomId,
      createdAt: new Date("2024-01-02"),
    });

    const updatedThread = applyUpsertComment(thread, comment);

    expect(updatedThread.comments).toContainEqual(comment);
    expect(updatedThread.updatedAt).toEqual(thread.updatedAt);
  });

  test("should update a comment if the thread has been updatedAt more recently", () => {
    const comment = createComment({ createdAt: new Date("2024-01-01") });
    const thread = createThread({
      id: comment.threadId,
      roomId: comment.roomId,
      comments: [comment],
      updatedAt: new Date("2024-01-03"),
    });

    const updatedComment = createComment({
      id: comment.id,
      threadId: comment.threadId,
      roomId: comment.roomId,
      body: {
        version: 1,
        content: [{ type: "paragraph", children: [{ text: "Updated" }] }],
      },
      createdAt: new Date("2024-01-01"),
      editedAt: new Date("2024-01-02"),
    });

    const updatedThread = applyUpsertComment(thread, updatedComment);
    expect(updatedThread.comments).toContainEqual(updatedComment);
    expect(updatedThread.updatedAt).toEqual(thread.updatedAt);
  });

  test("should not update a comment if the thread has been deleted", () => {
    const comment = createComment({ createdAt: new Date("2024-01-01") });
    const thread = createThread({
      id: comment.threadId,
      roomId: comment.roomId,
      comments: [comment],
      deletedAt: new Date("2024-01-02"),
    });

    const updatedComment = createComment({
      id: comment.id,
      threadId: comment.threadId,
      roomId: comment.roomId,
      body: {
        version: 1,
        content: [{ type: "paragraph", children: [{ text: "Updated" }] }],
      },
      createdAt: new Date("2024-01-03"),
      editedAt: new Date("2024-01-03"),
    });

    const updatedThread = applyUpsertComment(thread, updatedComment);
    expect(updatedThread.comments).not.toContainEqual(updatedComment);
  });

  test("should not add a new comment if the thread has been deleted", () => {
    const thread = createThread({
      deletedAt: new Date("2024-01-02"),
    });
    const comment = createComment({
      threadId: thread.id,
      roomId: thread.roomId,
      createdAt: new Date("2024-01-03"),
    });

    const updatedThread = applyUpsertComment(thread, comment);
    expect(updatedThread.comments).not.toContainEqual(comment);
  });
});
