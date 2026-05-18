import { stringifyCommentBody } from "@liveblocks/client";
import {
  getMentionsFromCommentBody,
  Liveblocks,
  type CommentBodyParagraph,
  type CommentData,
  type ThreadData,
} from "@liveblocks/node";
import dedent from "dedent";
import { COMMENT_AI_USER_INFO } from "../../api/database";
import { runFlowchartAgent } from "./agent";

type CommentLocation = {
  roomId: string;
  threadId: string;
  commentId: string;
};

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

async function createAiPlaceholderComment({
  roomId,
  threadId,
  feedId,
}: {
  roomId: string;
  threadId: string;
  feedId: string;
}) {
  return await liveblocks.createComment({
    roomId,
    threadId,
    data: {
      userId: COMMENT_AI_USER_INFO.id,
      metadata: { feedId, feedComplete: false },
      body: {
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "Thinking…" }],
          },
        ],
      },
    },
  });
}

async function updateAiPlaceholderComment({
  roomId,
  threadId,
  commentId,
  feedId,
  response,
}: CommentLocation & {
  feedId: string;
  response: string;
}) {
  const content: CommentBodyParagraph[] = response
    .split("\n\n")
    .map((line) => ({
      type: "paragraph",
      children: [{ text: line }],
    }));

  return await liveblocks.editComment({
    roomId,
    threadId,
    commentId,
    data: {
      metadata: { feedId, feedComplete: true },
      body: {
        version: 1,
        content,
      },
    },
  });
}

async function leaveAiReactionOnComment({
  roomId,
  threadId,
  commentId,
}: CommentLocation) {
  return liveblocks.addCommentReaction({
    roomId,
    threadId,
    commentId,
    data: {
      emoji: "👀",
      userId: COMMENT_AI_USER_INFO.id,
      createdAt: new Date(),
    },
  });
}

async function writeFeedWriting(
  roomId: string,
  feedId: string,
  responsePart: string,
  response: string
) {
  await liveblocks.createFeedMessage({
    roomId,
    feedId,
    data: { stage: "writing", responsePart, response },
  });
}

async function writeFeedComplete(
  roomId: string,
  feedId: string,
  payload: { response: string; reasoning: string; thinkingTime: number }
) {
  await liveblocks.createFeedMessage({
    roomId,
    feedId,
    data: {
      stage: "complete",
      response: payload.response,
      reasoning: payload.reasoning,
      thinkingTime: payload.thinkingTime,
    },
  });
}

async function getThreadAndComment({
  roomId,
  threadId,
  commentId,
}: CommentLocation) {
  const thread = await liveblocks.getThread({ roomId, threadId });
  const comment = thread?.comments.find((c) => c.id === commentId);
  return { thread, comment };
}

async function isAiMentionedInComment(comment: CommentData) {
  if (!comment.body) {
    return false;
  }

  const mentions = getMentionsFromCommentBody(comment.body);
  return mentions.map((m) => m.id).includes(COMMENT_AI_USER_INFO.id);
}

async function buildCommentThreadPrompt(thread: ThreadData): Promise<string> {
  const lines: string[] = [];

  for (const threadComment of thread.comments) {
    const content = threadComment.body
      ? await stringifyCommentBody(threadComment.body)
      : "Deleted comment";

    lines.push(
      `${threadComment.userId} at ${threadComment.createdAt}:\n${content}`
    );
  }

  return dedent`
    You were @mentioned in a comment thread on this flowchart.

    Use your flowchart tools when the user wants diagram changes.
    Always reply with a short plain-text summary of what you did (no markdown).
    If you only edited the diagram, still explain the changes briefly.

    <comment-thread>
    ${lines.join("\n\n")}
    </comment-thread>

    <comment-thread-metadata>
      <x>${thread.metadata.x}</x>
      <y>${thread.metadata.y}</y>
      <attached-to-node-id>${thread.metadata.attachedToNodeId ?? "none"}</attached-to-node-id>
    </comment-thread-metadata>
  `;
}

async function runCommentThreadAgent({
  roomId,
  feedId,
  thread,
}: {
  roomId: string;
  feedId: string;
  thread: ThreadData;
}) {
  const prompt = await buildCommentThreadPrompt(thread);
  const thinkingStartedAt = performance.now();
  let lastFeedText = "Editing flowchart…";

  await writeFeedWriting(roomId, feedId, lastFeedText, lastFeedText);

  const { text } = await runFlowchartAgent(roomId, prompt, {
    onProgress: async (message) => {
      lastFeedText = message;
      await writeFeedWriting(roomId, feedId, message, message);
    },
  });

  const response = text.trim() || "Done.";
  const thinkingEndedAt = performance.now();

  await writeFeedComplete(roomId, feedId, {
    response,
    reasoning: "",
    thinkingTime: (thinkingEndedAt - thinkingStartedAt) / 1000,
  });

  return { response };
}

export async function runAiCommentReply(
  commentLocation: CommentLocation
): Promise<{ status: number; body?: string; error?: string }> {
  const { roomId, threadId, commentId } = commentLocation;
  const feedId = `comment-reply-${roomId}-${threadId}-${commentId}`;

  try {
    const { thread, comment } = await getThreadAndComment(commentLocation);

    if (!thread || !comment) {
      throw new Error("Thread or comment not found");
    }

    if (!comment.body) {
      throw new Error("Comment deleted");
    }

    if (!(await isAiMentionedInComment(comment))) {
      return { status: 200, body: "AI is not mentioned in the comment" };
    }

    const placeholderComment = await createAiPlaceholderComment({
      roomId,
      threadId,
      feedId,
    });
    const placeholderCommentLocation: CommentLocation = {
      ...commentLocation,
      commentId: placeholderComment.id,
    };

    await Promise.all([
      liveblocks.createFeed({
        roomId,
        feedId,
        metadata: {
          type: "ai-comment-reply",
          threadId,
          commentId: placeholderComment.id,
        },
      }),
      leaveAiReactionOnComment(commentLocation),
    ]);

    const { response } = await runCommentThreadAgent({
      roomId,
      feedId,
      thread,
    });

    await updateAiPlaceholderComment({
      ...placeholderCommentLocation,
      feedId,
      response,
    });

    return { status: 200, body: "AI replied to comment" };
  } catch (err) {
    return { status: 400, error: `${err}` };
  }
}
