import { AI_USER_INFO } from "@/database";
import { getMentionsFromCommentBody, Liveblocks } from "@liveblocks/node";
import { sleep } from "workflow";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ThreadData, CommentData } from "@liveblocks/node";
import { stringifyCommentBody } from "@liveblocks/client";

type CommentLocation = {
  roomId: string;
  threadId: string;
  commentId: string;
};

type Stage = "thinking" | "writing" | "complete";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

// Main workflow
export async function handleCommentReply(commentLocation: CommentLocation) {
  "use workflow";

  try {
    // Get the thread and comment that triggered the workflow
    const { thread, comment } = await getThreadAndComment(commentLocation);

    if (!thread || !comment) {
      throw new Error("Thread or comment not found");
    }

    if (!comment.body) {
      throw new Error("Comment deleted");
    }

    // If AI is not mentioned in the comment, do not continue
    const mentions = getMentionsFromCommentBody(comment.body);
    if (!mentions.map((m) => m.id).includes(AI_USER_INFO.id)) {
      return { status: 200, body: "AI is not mentioned in the comment" };
    }

    const feedId = `comment-reply-${commentLocation.roomId}-${commentLocation.threadId}-${commentLocation.commentId}`;

    const [newComment, feed] = await Promise.all([
      // Create a new comment which we'll temporarily replace with feed info
      createComment({
        ...commentLocation,
        feedId,
      }),

      // Create a new feed which we'll use to stream "in progress" info
      createFeed({ roomId: commentLocation.roomId, feedId }),

      // Show AI avatar in avatar stack
      showPresence(commentLocation),
    ]);

    const [_, response] = await Promise.all([
      // Update the feed with "thinking" info
      createFeedMessage({
        feedId: feed.feedId,
        stage: "thinking",
        roomId: commentLocation.roomId,
      }),

      // Start generating an AI response
      generateResponse(thread, comment),
    ]);

    if (!response) {
      return { error: "Failed to generate response" };
    }

    await Promise.all([
      // Update the feed with "writing" info
      createFeedMessage({
        feedId: feed.feedId,
        stage: "writing",
        roomId: commentLocation.roomId,
      }),

      // Complete the comment with the AI response
      await completeComment({
        roomId: newComment.roomId,
        threadId: newComment.threadId,
        commentId: newComment.id,
        body: response,
      }),
    ]);

    // Comment written, feed is no longer needed
    createFeedMessage({
      feedId: feed.feedId,
      stage: "complete",
      roomId: commentLocation.roomId,
    }),
      console.log(
        "Workflow is complete! Run 'npx workflow web' to inspect your run"
      );

    return { status: 200, body: "AI replied to comment" };
  } catch (err) {
    return { status: 400, error: `${err}` };
  } finally {
    await hidePresence(commentLocation);
  }
}

// =======================================================================
// Steps

async function createFeed({
  roomId,
  feedId,
}: {
  roomId: string;
  feedId: string;
}) {
  "use step";

  return await liveblocks.createFeed({
    roomId,
    feedId,
    metadata: {},
  });
}

async function createFeedMessage({
  feedId,
  stage,
  roomId,
}: {
  feedId: string;
  stage: Stage;
  roomId: string;
}) {
  "use step";

  return await liveblocks.createFeedMessage({
    roomId,
    feedId,
    data: {},
  });
}

async function generateResponse(thread: ThreadData, comment: CommentData) {
  "use step";

  const stringifiedThread = (
    await Promise.all(
      thread.comments.map((c) =>
        c.body ? stringifyCommentBody(c.body) : "Deleted comment"
      )
    )
  ).join("\n\n");
  const stringifiedComment = comment.body
    ? await stringifyCommentBody(comment.body)
    : "Deleted comment";

  const prompt = `You are an assistant that helpfully responds to comments in a thread.
    
Here is the entire comment thread:
"""
${stringifiedThread}
"""

You must respond to the following comment inside the thread:
"""
${stringifiedComment}
"""

Write your response in markdown now.
`;

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-5"),
    prompt,
  });

  return text;
}

async function showPresence({ roomId }: CommentLocation) {
  "use step";

  return liveblocks.setPresence(roomId, {
    userId: AI_USER_INFO.id,
    userInfo: AI_USER_INFO,
    data: {},
  });
}

async function hidePresence({ roomId }: CommentLocation) {
  "use step";

  return liveblocks.setPresence(roomId, {
    ttl: 2,
    userId: AI_USER_INFO.id,
    userInfo: AI_USER_INFO,
    data: {},
  });
}

async function getThreadAndComment({
  roomId,
  threadId,
  commentId,
}: CommentLocation) {
  "use step";

  const thread = await liveblocks.getThread({ roomId, threadId });
  const comment = thread?.comments.find((comment) => comment.id === commentId);
  return { thread, comment };
}

async function createComment({
  roomId,
  threadId,
  feedId,
}: CommentLocation & {
  feedId: string;
}) {
  "use step";

  return await liveblocks.createComment({
    roomId,
    threadId,
    data: {
      userId: AI_USER_INFO.id,
      metadata: { feedId },
      body: {
        version: 1,
        content: [
          { type: "paragraph", children: [{ text: "Generating response..." }] },
        ],
      },
    },
  });
}

async function completeComment({
  roomId,
  threadId,
  commentId,
  body,
}: CommentLocation & {
  body: string;
}) {
  "use step";

  return await liveblocks.editComment({
    roomId,
    threadId,
    commentId,
    data: {
      body: {
        version: 1,
        content: [{ type: "paragraph", children: [{ text: body }] }],
      },
    },
  });
}
