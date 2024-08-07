"use server";

import { createStreamableValue } from "ai/rsc";
import { CoreMessage, streamText } from "ai";
import { openai } from "@ai-sdk/openai";

// Send messages to AI and stream a result back
export async function continueConversation(messages: CoreMessage[]) {
  const result = await streamText({
    model: openai("gpt-4o"),
    messages,
  });

  const stream = createStreamableValue(result.textStream);
  return stream.value;
}
