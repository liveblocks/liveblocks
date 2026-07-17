import { Liveblocks } from "@liveblocks/node";
import { streamText } from "ai";
import { aiModel } from "../../config";
import { HtmlVersionData } from "../../types";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You create small, self-contained interactive HTML components.
Return exactly one complete HTML document with <!doctype html>, <html>, <head>, and <body>.
Use inline CSS and inline JavaScript only.
Do not include markdown fences, explanations, comments, external scripts, external stylesheets, images, iframes, network requests, or links to CDNs.
The component will run in a sandboxed iframe inside a collaborative text editor, so keep it compact, accessible, and responsive.`;

/**
 * Generates an HTML component and streams the result into a Liveblocks feed.
 *
 * Each HTML component in the document owns one feed. Every generation
 * appends a new feed message and progressively updates it while the
 * model streams, so all connected clients watch the code stream in
 * realtime, and the feed doubles as the component's version history.
 * https://liveblocks.io/docs/collaboration-features/ai-collaboration
 *
 * Note: this example uses anonymous auth, so the route accepts any
 * roomId/feedId. In a real app, authenticate the request and check the
 * user has write access to the room before writing to its feeds.
 */
export async function POST(request: Request) {
  if (!process.env.AI_GATEWAY_API_KEY) {
    return new Response("Missing AI_GATEWAY_API_KEY", { status: 403 });
  }

  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new Response("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const { roomId, feedId, prompt } = parseBody(body);

  if (!roomId || !feedId || !prompt) {
    return new Response("Missing roomId, feedId, or prompt", { status: 400 });
  }

  if (prompt.length > 2000) {
    return new Response("Prompt is too long", { status: 400 });
  }

  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
  });

  // The feed may already exist (this is not the first generation).
  await liveblocks
    .createFeed({ roomId, feedId, metadata: { kind: "html-component" } })
    .catch(() => {});

  const message = await liveblocks.createFeedMessage({
    roomId,
    feedId,
    data: { prompt, html: "", status: "generating", source: "ai" },
  });

  const update = (data: HtmlVersionData) =>
    liveblocks.updateFeedMessage({
      roomId,
      feedId,
      messageId: message.id,
      data,
    });

  try {
    const result = streamText({
      model: aiModel,
      system: SYSTEM_PROMPT,
      prompt: `Build this interactive HTML component: ${prompt}`,
    });

    let html = "";
    let lastFlush = 0;

    // Iterate the full stream: the AI SDK reports failures as `error`
    // parts instead of throwing, so `textStream` alone would silently
    // truncate failed generations.
    for await (const part of result.fullStream) {
      if (part.type === "error") {
        throw part.error instanceof Error
          ? part.error
          : new Error(String(part.error));
      }

      if (part.type !== "text-delta") {
        continue;
      }

      html += part.text;

      // Throttle feed updates while streaming
      const now = Date.now();
      if (now - lastFlush >= 100) {
        lastFlush = now;
        await update({
          prompt,
          html: stripMarkdownFences(html),
          status: "generating",
          source: "ai",
        });
      }
    }

    await update({
      prompt,
      html: stripMarkdownFences(html),
      status: "complete",
      source: "ai",
    });

    return Response.json({ messageId: message.id });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Failed to generate HTML";

    await update({
      prompt,
      html: "",
      status: "error",
      source: "ai",
      error: reason,
    }).catch(() => {});

    return new Response(reason, { status: 500 });
  }
}

function parseBody(body: unknown) {
  if (body === null || typeof body !== "object") {
    return { roomId: "", feedId: "", prompt: "" };
  }

  return {
    roomId:
      "roomId" in body && typeof body.roomId === "string"
        ? body.roomId.trim()
        : "",
    feedId:
      "feedId" in body && typeof body.feedId === "string"
        ? body.feedId.trim()
        : "",
    prompt:
      "prompt" in body && typeof body.prompt === "string"
        ? body.prompt.trim()
        : "",
  };
}

function stripMarkdownFences(html: string) {
  return html
    .replace(/^\s*```(?:html)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}
