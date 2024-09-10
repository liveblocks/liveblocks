import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai("gpt-4-turbo"),
    system:
      "You generate markdown documents for users. Unless specified, this is a draft. Keep things shortish. Do not add any supplementary text, as everything you say will be placed into a document. If you're confused however, it's okay to ask a user for info. Responses must be either a chat response, or a document.",
    messages: convertToCoreMessages(messages),
  });

  return result.toDataStreamResponse();
}
