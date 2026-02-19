"use server";

import { createStreamableValue } from "@ai-sdk/rsc";
import { ModelMessage, streamText } from "ai";
import { aiModel } from "../config";

// Send messages to AI and stream a result back
export async function continueConversation(messages: ModelMessage[]) {
  const result = await streamText({
    model: aiModel,
    messages,
  });

  const stream = createStreamableValue(result.textStream);
  return stream.value;
}
