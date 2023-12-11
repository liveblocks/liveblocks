// Add your secret key from a project's API keys dashboard
import { Liveblocks } from "@liveblocks/node";

const LIVEBLOCKS_API_SECRET = process.env.LIVEBLOCKS_SECRET_KEY as string;
const liveblocks = new Liveblocks({ secret: LIVEBLOCKS_API_SECRET });

export async function createThread(event: any) {
  const roomId = "nextjs-comments-slack-3535235235";
  console.log("new thread", event);
  const thread = await liveblocks.createThread({
    roomId,
    data: {
      comment: {
        userId: "chris@example.com",
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: event.text }] }],
        },
      },
    },
  });
  await liveblocks.editThreadMetadata({
    roomId,
    threadId: thread.id,
    data: {
      userId: "chris@example.com",
      metadata: {
        slackTsStore: `{ ${thread.comments[0].id}: ${event.ts} }`,
      },
    },
  });
}

export async function createComment(event: any) {
  console.log("new comment", event);
  const roomId = "nextjs-comments-slack-3535235235";

  // Get threadId from thread_ts thread metadata
  // ...

  // const threadId = event.metadata.event_payload.threadId;
  const threadId = "";

  // Create comment in thread
  const comment = await liveblocks.createComment({
    roomId,
    threadId,
    data: {
      userId: "chris@example.com",
      body: {
        version: 1,
        content: [{ type: "paragraph", children: [{ text: event.text }] }],
      },
    },
  });

  // Get the previous thread metadata
  const thread = await liveblocks.getThread({ roomId, threadId });
  const prev: any = thread.metadata.slackTsStore;

  const slackTsStore = JSON.stringify({
    ...prev,
    [comment.id]: event.ts,
  });

  // Update metadata with new ID
  await liveblocks.editThreadMetadata({
    roomId,
    threadId: threadId,
    data: {
      userId: "chris@example.com",
      metadata: {
        slackTsStore,
      },
    },
  });

  // Attach commentId metadata to Slack comment
  // ...
}
