import { addReaction } from "../store";
import { createComment, createThread } from "./_dummies";

describe("addReaction", () => {
  it("should add a new reaction to a comment", () => {
    const comment = createComment({ createdAt: new Date("2024-01-01") });
    const thread = createThread({
      id: comment.threadId,
      roomId: comment.roomId,
      comments: [comment],
    });

    const reaction = {
      emoji: "👍",
      createdAt: new Date("2024-01-02"),
      userId: "user_1",
    };

    const updatedThread = addReaction(thread, comment.id, reaction);

    expect(updatedThread.comments[0].reactions).toHaveLength(1);
    expect(updatedThread.comments[0].reactions[0].emoji).toEqual(
      reaction.emoji
    );
    expect(updatedThread.comments[0].reactions[0].users[0].id).toEqual(
      reaction.userId
    );
    expect(updatedThread.updatedAt).toEqual(reaction.createdAt);
  });

  it("should add a new reaction to a comment with existing reactions", () => {
    const comment = createComment({
      createdAt: new Date("2024-01-01"),
      reactions: [
        {
          emoji: "👍",
          createdAt: new Date("2024-01-02"),
          users: [{ id: "user_1" }],
        },
      ],
    });
    const thread = createThread({
      id: comment.threadId,
      roomId: comment.roomId,
      comments: [comment],
    });

    const newReaction = {
      emoji: "👎",
      createdAt: new Date("2024-01-03"),
      userId: "user_2",
    };

    const updatedThread = addReaction(thread, comment.id, newReaction);

    expect(updatedThread.comments[0].reactions).toHaveLength(2);
    expect(updatedThread.comments[0].reactions[0].emoji).toEqual("👍");
    expect(updatedThread.comments[0].reactions[0].users[0].id).toEqual(
      "user_1"
    );
    expect(updatedThread.comments[0].reactions[1].emoji).toEqual(
      newReaction.emoji
    );
    expect(updatedThread.comments[0].reactions[1].users[0].id).toEqual(
      newReaction.userId
    );
    expect(updatedThread.updatedAt).toEqual(newReaction.createdAt);
  });

  it("should not add a duplicate reaction for the same user", () => {
    const comment = createComment({
      createdAt: new Date("2024-01-01"),
      reactions: [
        {
          emoji: "👍",
          createdAt: new Date("2024-01-02"),
          users: [{ id: "user_1" }],
        },
      ],
    });
    const thread = createThread({
      comments: [comment],
    });

    const reaction = {
      emoji: "👍",
      createdAt: new Date("2024-01-03"),
      userId: "user_1",
    };

    const updatedThread = addReaction(thread, comment.id, reaction);

    expect(updatedThread.comments[0].reactions[0].users).toHaveLength(1); // No additional user should be added
  });

  it("should add a new user to an existing reaction", () => {
    const comment = createComment({
      createdAt: new Date("2024-01-01"),
      reactions: [
        {
          emoji: "👍",
          createdAt: new Date("2024-01-02"),
          users: [{ id: "user_1" }],
        },
      ],
    });
    const thread = createThread({
      comments: [comment],
    });

    const reaction = {
      emoji: "👍",
      createdAt: new Date("2024-01-03"),
      userId: "user_2",
    };
    const updatedThread = addReaction(thread, comment.id, reaction);

    expect(updatedThread.comments[0].reactions[0].users).toHaveLength(2);
    expect(updatedThread.comments[0].reactions[0].users[1].id).toEqual(
      "user_2"
    );
  });

  it("should not add a reaction to a deleted comment", () => {
    const comment = createComment({
      createdAt: new Date("2024-01-01"),
    });
    comment.deletedAt = new Date("2024-01-02");

    const thread = createThread({
      comments: [comment],
    });

    const reaction = {
      emoji: "👍",
      createdAt: new Date("2024-01-03"),
      userId: "user_2",
    };
    const updatedThread = addReaction(thread, comment.id, reaction);

    expect(updatedThread).toEqual(thread);
  });
});
