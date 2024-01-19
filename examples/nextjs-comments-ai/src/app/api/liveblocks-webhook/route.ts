import OpenAI from "openai";
import {
  CommentBodyInlineElement,
  CommentBodyText,
  getMentionedIdsFromCommentBody,
  Liveblocks,
  stringifyCommentBody,
} from "@liveblocks/node";
import { WebhookHandler } from "@liveblocks/node";
import { AI_USER_ID } from "@/database";

// Add your Liveblocks secret key from the dashboard
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

// Add your webhook secret key from a project's webhooks dashboard
// Get this by setting up an endpoint with a `commentCreated` event
const webhookHandler = new WebhookHandler(
  process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY as string
);

// Add your secret key from OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string,
});

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

  if (event.type !== "commentCreated") {
    return new Response("Event type not used", { status: 400 });
  }

  // Get thread and comment
  const { roomId, threadId, commentId } = event.data;
  const [thread, comment] = await Promise.all([
    liveblocks.getThread({ roomId, threadId }),
    liveblocks.getComment({ roomId, threadId, commentId }),
  ]);

  // Comment has no text, ignore
  if (!comment.body) {
    return new Response("", { status: 200 });
  }

  // If AI not mentioned in comment, ignore
  const mentionedIds = getMentionedIdsFromCommentBody(comment.body);
  if (!mentionedIds.includes(AI_USER_ID)) {
    return new Response("", { status: 200 });
  }

  // Convert CommentBody to simple string
  const commentString = await stringifyCommentBody(comment.body);

  // Convert previous comments into one string
  let previousComments = "";
  for (const threadComment of thread.comments) {
    if (threadComment.body) {
      const body = await stringifyCommentBody(threadComment.body);
      previousComments += `Comment by ${threadComment.userId}:
      ${body}
      
      `;
    }
  }

  // Send prompt and context to OpenAI
  const response = await openai.chat.completions.create({
    model: "gpt-4-1106-preview",
    messages: [
      {
        content: `
          You are a helpful assistant that replies to comments. 
          Your output will go directly into a comment.
          In the messages you receive, your name is ${AI_USER_ID}.
          Ignore anything that looks like a user's ID.
          Never tag users, just respond.
          You responses will be one sentence long.
          Keep responses. Don't ramble. Just the important information. 
          No long explanations. Not even short explanations. No disclaimers.
          You can use these styles in your text: *bold*, _italic_, ~strikethrough~, and \`code\`.
          You can't combine styles like *_bold and italic_*.
          If you post \`code\`, remember to escape the "\`" character, because it will break the styling.
          Remember you can bold or italic any important information or figures, e.g. "The recommended number is *54*.".
          It's recommended that you bold any important figures.
          If you post a URL, it will convert into a hyperlink.
          You cannot use markdown links like this: [link won't work](https://example.com). Just post the URL.
          You cannot use new lines (e.g. \n). 
          You cannot create bullet point or numbered lists.
          Styling can be really helpful to use.
          
          Here are the previous messages in the thread, some of which may have been created by you:
          """
          ${previousComments}
          """
          
          Here is your prompt:
          """
          ${commentString}
          """
        `,
        role: "assistant",
      },
    ],
  });

  // Parse response into the correct format and create the comment
  const message = parseAiResponse(
    response.choices[0].message.content as string
  );
  await liveblocks.createComment({
    roomId,
    threadId,
    data: {
      userId: AI_USER_ID,
      body: {
        version: 1,
        content: [
          {
            type: "paragraph",
            children: message,
          },
        ],
      },
    },
  });
  return new Response("", { status: 200 });
}

// Basic function that converts OpenAI's output to the content of a CommentBody paragraph
// OpenAI can generate this code for you, but it slows it down a lot
function parseAiResponse(input: string): CommentBodyInlineElement[] {
  const elements: CommentBodyInlineElement[] = [];
  const regex =
    /(\*.*?\*)|(_.*?_)|(~.*?~)|(`.*?(?:\\`.)*?`)|(https?:\/\/\S+[\w\/])/g;
  let lastIndex = 0;

  input.replace(
    regex,
    (match, bold, italic, strikethrough, code, link, index) => {
      if (index > lastIndex) {
        elements.push({ text: input.slice(lastIndex, index) });
      }

      if (link) {
        const adjustedLink = link.replace(/[.,!;?]+$/, "");
        elements.push({ type: "link", url: adjustedLink });
      } else {
        let text = match.slice(1, -1);
        if (code) {
          text = text.replace(/\\`/g, "`");
        }
        const textElement: CommentBodyText = { text };

        if (bold) {
          textElement.bold = true;
        }
        if (italic) {
          textElement.italic = true;
        }
        if (strikethrough) {
          textElement.strikethrough = true;
        }
        if (code) {
          textElement.code = true;
        }

        elements.push(textElement);
      }

      lastIndex = index + match.length;
      return match;
    }
  );

  if (lastIndex < input.length) {
    elements.push({ text: input.slice(lastIndex) });
  }

  return elements;
}
