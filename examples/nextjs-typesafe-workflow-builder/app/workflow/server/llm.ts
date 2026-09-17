import "server-only";

export type LlmRunOptions = {
  system: string;
  prompt: string;
  model: string;
  // Called with the full text so far. Throttled by the caller.
  onChunk: (text: string) => void | Promise<void>;
  signal?: AbortSignal;
};

export type LlmResult = { text: string; mock: boolean; model: string };

export async function runLlm(options: LlmRunOptions): Promise<LlmResult> {
  if (!process.env.AI_GATEWAY_API_KEY) {
    return streamMockReply(options);
  }

  // Model ids like "openai/gpt-5.4-nano" are routed through the Vercel AI
  // Gateway, authenticated with AI_GATEWAY_API_KEY.
  const { streamText } = await import("ai");
  const result = streamText({
    model: options.model,
    system: options.system || undefined,
    prompt: options.prompt,
    abortSignal: options.signal,
  });

  let text = "";

  for await (const delta of result.textStream) {
    text += delta;
    await options.onChunk(text);
  }

  return { text, mock: false, model: options.model };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Keyless fallback: streams a canned reply built from the resolved prompt, so
 * the rest of the workflow (and downstream Jev nodes) still has text to work
 * with.
 */
async function streamMockReply(options: LlmRunOptions): Promise<LlmResult> {
  const firstLine =
    options.prompt
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "the request";
  const reply = [
    "Thanks for reaching out, and sorry for the trouble.",
    `Here is a mock reply for: "${firstLine.slice(0, 120)}".`,
    "Set AI_GATEWAY_API_KEY to stream a real model response through this node.",
  ].join(" ");
  const words = reply.split(" ");
  let text = "";

  for (const word of words) {
    if (options.signal?.aborted) {
      break;
    }

    text += (text ? " " : "") + word;
    await options.onChunk(text);
    await sleep(35);
  }

  return { text, mock: true, model: "mock" };
}
