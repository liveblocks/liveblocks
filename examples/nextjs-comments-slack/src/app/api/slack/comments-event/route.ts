import {
  CommentBody,
  CommentCreatedEvent,
  Liveblocks,
  stringifyCommentBody,
  ThreadCreatedEvent,
  WebhookHandler,
} from "@liveblocks/node";
import { WebClient } from "@slack/web-api";
import slackifyMarkdown from "slackify-markdown";

// Add your webhook secret key from a project's webhooks dashboard
const LIVEBLOCKS_WEBHOOK_SECRET = process.env.WEBHOOK_SECRET_KEY as string;
const webhookHandler = new WebhookHandler(LIVEBLOCKS_WEBHOOK_SECRET);

// Add your secret key from a project's API keys dashboard
const LIVEBLOCKS_API_SECRET = process.env.LIVEBLOCKS_SECRET_KEY as string;
const liveblocks = new Liveblocks({ secret: LIVEBLOCKS_API_SECRET });

// Set up Slack WebClient
const SLACK_BOT_SECRET = process.env.SLACK_TOKEN as string;
const web = new WebClient(SLACK_BOT_SECRET);

export async function POST(request: Request) {
  const body = await request.json();
  const headers = request.headers;

  // Verify if this is a real webhook request
  let event;
  try {
    event = webhookHandler.verifyRequest({
      headers: headers,
      rawBody: JSON.stringify(body),
    });
  } catch (err) {
    console.error(err);
    return new Response("Could not verify webhook call", { status: 400 });
  }

  if (event.type === "threadCreated") {
    return await createThread(event);
  }

  if (event.type === "commentCreated") {
    return await createComment(event);
  }

  return new Response(null, { status: 200 });
}

async function createComment(event: CommentCreatedEvent) {
  const { roomId, threadId, commentId } = event.data;
  const thread = await liveblocks.getThread({ roomId, threadId });
  const comment = await liveblocks.getComment({ roomId, threadId, commentId });

  const { text, markdown } = await createSlackText(comment.body as CommentBody);
  console.log(markdown);

  // Attach metadata to Slack comment
  const metadata = {
    event_type: "create_comment",
    event_payload: { roomId, threadId, commentId },
  };

  const result = await web.chat.postMessage({
    channel: "C069RSR2E48",
    thread_ts: thread.metadata.ts,
    metadata,
    text,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: markdown,
        },
      },
    ],
  });
  console.log(result);

  return new Response(null, { status: 200 });
}

async function createThread(event: ThreadCreatedEvent) {
  const { roomId, threadId } = event.data;
  const thread = await liveblocks.getThread({ roomId, threadId });
  const { body, userId } = thread.comments[0];

  const { text, markdown } = await createSlackText(body as CommentBody);
  console.log(markdown);

  // Attach metadata to Slack thread
  const metadata = {
    event_type: "create_thread",
    event_payload: { roomId, threadId },
  };

  const result = await web.chat.postMessage({
    channel: "C069RSR2E48",
    metadata,
    text,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: markdown,
        },
      },
    ],
  });
  console.log(result);

  // Attach the Slack thread's timestamp (also a unique ID) to the thread metadata
  const { ts } = result;
  await liveblocks.editThreadMetadata({
    roomId,
    threadId,
    data: {
      metadata: { ts: ts || null },
      userId,
    },
  });

  return new Response(null, { status: 200 });
}

async function createSlackText(body: CommentBody) {
  const text = await stringifyCommentBody(body as CommentBody);
  const markdown = slackifyMarkdown(
    await stringifyCommentBody(body as CommentBody, {
      format: "markdown",
    })
  );

  return { text, markdown };
}
