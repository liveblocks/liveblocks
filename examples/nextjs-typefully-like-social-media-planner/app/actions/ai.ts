"use server";

import { createStreamableValue } from "ai/rsc";
import { CoreMessage, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { aiModel } from "../config";

// Send messages to AI and stream a result back
export async function continueConversation(messages: CoreMessage[]) {
  const result = await streamText({
    model: openai(aiModel),
    messages,
  });

  const stream = createStreamableValue(result.textStream);
  return stream.value;
}
