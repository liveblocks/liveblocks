import { AI_USER_INFO } from "@/database";
import { getMentionsFromCommentBody, Liveblocks } from "@liveblocks/node";
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
export async function handleAiCommentReply(commentLocation: CommentLocation) {
  "use workflow";

  const feedId = `comment-reply-${commentLocation.roomId}-${commentLocation.threadId}-${commentLocation.commentId}`;

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
    if (!(await isAiMentionedInComment(comment))) {
      return { status: 200, body: "AI is not mentioned in the comment" };
    }

    // Create a comment which works as placeholder for the AI response
    // We'll replace it with custom UI
    const placeholderComment = await createPlaceholderComment({
      ...commentLocation,
      feedId,
    });

    const [feed] = await Promise.all([
      // Create a new feed which we'll use as an AI response comment
      createFeed({
        feedId,
        roomId: commentLocation.roomId,
        threadId: commentLocation.threadId,
        commentId: placeholderComment.id,
      }),

      // Show AI avatar in avatar stack
      showPresence(commentLocation),
    ]);

    const [response] = await Promise.all([
      // Start generating an AI response
      generateResponse(thread, comment),

      // Update the feed with "thinking" info
      createFeedMessage({
        feedId: feed.feedId,
        stage: "thinking",
        roomId: commentLocation.roomId,
      }),
    ]);

    if (!response) {
      return { error: "Failed to generate response" };
    }

    // Feed complete, add AI response
    await createFeedMessage({
      feedId: feed.feedId,
      stage: "complete",
      roomId: commentLocation.roomId,
      response,
    });

    // Add response to placeholder commnet, in case anyone uses
    // comment APIs and wants to see AI responses in there
    await updatePlaceholderComment({
      ...commentLocation,
      feedId,
      response,
    });

    // Hide AI avatar from avatar stack
    await hidePresence(commentLocation);

    return { status: 200, body: "AI replied to comment" };
  } catch (err) {
    // Hide AI avatar from avatar stack
    await hidePresence(commentLocation);

    return { status: 400, error: `${err}` };
  }
}

// =======================================================================
// Steps

async function createFeed({
  roomId,
  threadId,
  commentId,
  feedId,
}: {
  roomId: string;
  threadId: string;
  feedId: string;
  commentId: string;
}) {
  "use step";

  return await liveblocks.createFeed({
    roomId,
    feedId,
    metadata: {
      type: "ai-comment-reply",
      threadId,
      commentId,
    },
  });
}

async function createFeedMessage({
  feedId,
  stage,
  roomId,
  response,
}: {
  feedId: string;
  stage: Stage;
  roomId: string;
  response?: string;
}) {
  "use step";

  return await liveblocks.createFeedMessage({
    roomId,
    feedId,
    data: { stage, response },
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

async function isAiMentionedInComment(comment: CommentData) {
  "use step";

  if (!comment.body) {
    return false;
  }

  const mentions = getMentionsFromCommentBody(comment.body);
  return mentions.map((m) => m.id).includes(AI_USER_INFO.id);
}

async function createPlaceholderComment({
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
          {
            type: "paragraph",
            children: [{ text: "Placeholder for a feed" }],
          },
        ],
      },
    },
  });
}

async function updatePlaceholderComment({
  roomId,
  threadId,
  feedId,
  response,
}: CommentLocation & {
  feedId: string;
  response: string;
}) {
  "use step";

  return await liveblocks.editComment({
    roomId,
    threadId,
    commentId: feedId,
    data: {
      metadata: { feedId },
      body: {
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: response }],
          },
        ],
      },
    },
  });
}
