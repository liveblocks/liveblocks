import { AI_USER_INFO } from "@/database";
import { getMentionsFromCommentBody, Liveblocks } from "@liveblocks/node";
import { streamText } from "ai";
import { anthropic, AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import type { ThreadData, CommentData } from "@liveblocks/node";
import { stringifyCommentBody } from "@liveblocks/client";
import { ModelMessage } from "ai";

type CommentLocation = {
  roomId: string;
  threadId: string;
  commentId: string;
};

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

// Main workflow: Create a feed (+ comment placeholder) when AI
// is tagged in a comment, and stream an AI response into it
export async function handleAiCommentReply(commentLocation: CommentLocation) {
  "use workflow";

  const { roomId, threadId, commentId } = commentLocation;
  const feedId = `comment-reply-${roomId}-${threadId}-${commentId}`;

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
    // We'll replace it with custom UI containing feed data
    const placeholderComment = await createPlaceholderComment({
      ...commentLocation,
      feedId,
    });
    const placeholderCommentLocation = {
      ...commentLocation,
      commentId: placeholderComment.id,
    };

    await Promise.all([
      // Create a new feed which we'll use as an AI response comment
      createFeed({
        feedId,
        ...placeholderCommentLocation,
      }),

      // Show AI avatar in avatar stack
      showPresence(commentLocation),
    ]);

    // Stream an AI response in (also adds feed message updates)
    const { response } = await streamResponse({
      roomId,
      feedId,
      thread,
      comment,
    });

    if (!response) {
      return { error: "Failed to generate response" };
    }

    // Add response to placeholder comment, in case anyone uses
    // comment APIs and wants to see AI responses in there
    await updatePlaceholderComment({
      ...placeholderCommentLocation,
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

// Holds the live feed for the comment response
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
      // threadId and commentId are for the placeholder comment
      threadId,
      commentId,
    },
  });
}

// Streams an AI response into the feed
async function streamResponse({
  roomId,
  feedId,
  thread,
  comment,
}: {
  roomId: string;
  feedId: string;
  thread: ThreadData;
  comment: CommentData;
}) {
  "use step";

  // Convert comment format into simple text
  const stringifiedComment = comment.body
    ? await stringifyCommentBody(comment.body)
    : "Deleted comment";

  // System prompt highlights uer ID and includes the comment to respond to
  const system = `You are an assistant that helpfully responds to comments in a thread in plain text (NOT markdown). 
  
Your user ID is ${AI_USER_INFO.id}.

Respond to the following comment inside the thread:
"""
${stringifiedComment}
"""
`;

  // Place the comment thread into a list of messages
  const messages: ModelMessage[] = [];

  for (const comment of thread.comments) {
    const buildMessageContent = (
      content: string
    ) => `${comment.userId} at ${comment.createdAt}: 
      
      """    
      ${content}
      """`;
    messages.push({
      role: comment.userId === AI_USER_INFO.id ? "assistant" : "user",
      content: comment.body
        ? buildMessageContent(await stringifyCommentBody(comment.body))
        : buildMessageContent("Deleted comment"),
    });
  }

  // Stream the response from the AI model with reasoning enabled
  const result = streamText({
    model: anthropic("claude-sonnet-4-5"),
    system,
    messages,
    providerOptions: {
      anthropic: {
        sendReasoning: true,
        thinking: { type: "enabled", budgetTokens: 10000 },
      } satisfies AnthropicLanguageModelOptions,
    },
  });

  let totalReasoning = "";
  let totalText = "";
  const thinkingStartedAt = performance.now();
  const promises = [];

  for await (const part of result.fullStream) {
    // With each reasoning part, add a new feed message
    if (part.type === "reasoning-delta") {
      totalReasoning += part.text;

      promises.push(
        liveblocks.createFeedMessage({
          roomId,
          feedId,
          data: {
            stage: "thinking",
            responsePart: part.text,
            response: totalReasoning,
          },
        })
      );
    } else if (part.type === "text-delta") {
      totalText += part.text;

      promises.push(
        liveblocks.createFeedMessage({
          roomId,
          feedId,
          data: {
            stage: "writing",
            responsePart: part.text,
            response: totalText,
          },
        })
      );
    }
  }

  // Check how long the generation took
  const thinkingEndedAt = performance.now();

  // Wait for all feed message creations to complete so there's no race conditions
  await Promise.all(promises);

  // Send a completed feed message with the full response and reasoning
  await liveblocks.createFeedMessage({
    roomId,
    feedId,
    data: {
      stage: "complete",
      response: totalText,
      reasoning: totalReasoning,
      thinkingTime: (thinkingEndedAt - thinkingStartedAt) / 1000,
    },
  });

  return { response: totalText, reasoning: totalReasoning };
}

// Shows the AI avatar in the avatar stack
async function showPresence({ roomId }: CommentLocation) {
  "use step";

  return liveblocks.setPresence(roomId, {
    userId: AI_USER_INFO.id,
    userInfo: AI_USER_INFO,
    data: {},
  });
}

// Hides the AI avatar from the avatar stack
async function hidePresence({ roomId }: CommentLocation) {
  "use step";

  return liveblocks.setPresence(roomId, {
    ttl: 2,
    userId: AI_USER_INFO.id,
    userInfo: AI_USER_INFO,
    data: {},
  });
}

// Gets the thread and comment that triggered the workflow
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

// Checks if the AI is mentioned in the comment
async function isAiMentionedInComment(comment: CommentData) {
  "use step";

  if (!comment.body) {
    return false;
  }

  const mentions = getMentionsFromCommentBody(comment.body);
  return mentions.map((m) => m.id).includes(AI_USER_INFO.id);
}

// Creates a placeholder comment for the AI response
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

// Updates the placeholder comment with the AI response
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
