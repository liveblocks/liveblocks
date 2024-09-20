import {
  getLastCommentWithMention,
  getUnreadComments,
} from "../thread-notification";
import {
  buildCommentBodyWithMention,
  commentBody1,
  commentBody2,
  commentBody3,
  generateThreadId,
  makeComment,
  makeThreadInboxNotification,
} from "./_helpers";

describe("thread notification", () => {
  describe("internals", () => {
    it("should get unread comments ", () => {
      const threadId = generateThreadId();
      const comment1 = makeComment({
        userId: "user-dracula",
        threadId,
        body: commentBody1,
        createdAt: new Date("2024-09-10T08:10:00.000Z"),
      });
      const comment2 = makeComment({
        userId: "user-mina",
        threadId,
        body: commentBody2,
        createdAt: new Date("2024-09-10T08:14:00.000Z"),
      });
      const comment3 = makeComment({
        userId: "user-carmilla",
        threadId,
        body: commentBody3,
        createdAt: new Date("2024-09-10T08:16:00.000Z"),
      });
      const inboxNotification = makeThreadInboxNotification({
        threadId,
        notifiedAt: new Date("2024-09-10T08:20:00.000Z"),
      });

      const expected = [comment2, comment3];
      const unreadComments = getUnreadComments({
        comments: [comment1, comment2, comment3],
        inboxNotification,
        userId: "user-dracula",
      });
      expect(unreadComments).toEqual(expected);
    });

    it("should get last comment with mention", () => {
      const threadId = generateThreadId();
      const comment1 = makeComment({
        userId: "user-dracula",
        threadId,
        body: buildCommentBodyWithMention({ mentionedUserId: "user-mina" }),
        createdAt: new Date("2024-09-10T08:10:00.000Z"),
      });
      const comment2 = makeComment({
        userId: "user-carmilla",
        threadId,
        body: commentBody1,
        createdAt: new Date("2024-09-10T08:12:00.000Z"),
      });

      const inboxNotification = makeThreadInboxNotification({
        threadId,
        notifiedAt: new Date("2024-09-10T08:20:00.000Z"),
      });

      const unreadComments1 = getUnreadComments({
        comments: [comment1, comment2],
        inboxNotification,
        userId: "user-mina",
      });
      const unreadComments2 = getUnreadComments({
        comments: [comment1, comment2],
        inboxNotification,
        userId: "user-dracula",
      });

      const lastCommentWithMention1 = getLastCommentWithMention({
        comments: unreadComments1,
        mentionedUserId: "user-mina",
      });
      const lastCommentWithMention2 = getLastCommentWithMention({
        comments: unreadComments2,
        mentionedUserId: "user-dracula",
      });

      expect(lastCommentWithMention1).toEqual(comment1);
      expect(lastCommentWithMention2).toBe(null);
    });
  });
});
