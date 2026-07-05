import { streamText } from "ai";
import { aiModel } from "../../config";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You create small, self-contained interactive HTML components.
Return exactly one complete HTML document with <!doctype html>, <html>, <head>, and <body>.
Use inline CSS and inline JavaScript only.
Do not include markdown fences, explanations, comments, external scripts, external stylesheets, images, iframes, network requests, or links to CDNs.
The component will run in a sandboxed iframe inside a collaborative text editor, so keep it compact, accessible, and responsive.`;

export async function POST(request: Request) {
  if (!process.env.AI_GATEWAY_API_KEY) {
    return new Response("Missing AI_GATEWAY_API_KEY", { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const prompt = getPrompt(body);

  if (!prompt) {
    return new Response("Missing prompt", { status: 400 });
  }

  const result = streamText({
    model: aiModel,
    system: SYSTEM_PROMPT,
    prompt: `Build this interactive HTML component: ${prompt}`,
  });

  return result.toTextStreamResponse();
}

function getPrompt(body: unknown) {
  if (body === null || typeof body !== "object" || !("prompt" in body)) {
    return "";
  }

  return typeof body.prompt === "string" ? body.prompt.trim() : "";
}
