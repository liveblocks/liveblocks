import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai("gpt-4-turbo"),
    system:
      "You generate markdown documents for users. Unless specified, this is a draft. Keep things shortish.",
    messages: convertToCoreMessages(messages),
  });

  return result.toDataStreamResponse();
}
