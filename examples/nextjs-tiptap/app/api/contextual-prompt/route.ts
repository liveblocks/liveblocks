import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import * as z from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const lmstudio = createOpenAICompatible({
  name: "lmstudio",
  baseURL: "http://localhost:1234/v1",
});

const requestSchema = z
  .object({
    prompt: z.string().describe("A description of the user's request"),
    context: z
      .object({
        beforeSelection: z.string().describe("The text before the selection"),
        selection: z.string().describe("The selected text"),
        afterSelection: z.string().describe("The text after the selection"),
      })
      .describe("The text editor's context"),
  })
  .describe("The user's request and context");

const responseSchema = z
  .object({
    type: z
      .enum(["insert", "replace", "other"])
      .describe(
        'The type of response: "insert" to add new text **after** the selection (e.g. "continue writing", "complete the sentence"), "replace" to modify the selection with new text (e.g. "fix the spelling", "translate to French", "make this paragraph longer"), "other" to respond with analysis, explanations, or summaries (e.g. "explain this paragraph", "what is this word?")'
      ),
    text: z.string().describe("The text of the response"),
  })
  .describe(
    "The response to the user's request (strict, all fields are required and no additional fields are allowed)"
  );

const system =
  "You are an helpful AI assistant in a text editor." +
  "\n\n" +
  "The user will provide a JSON request with the following schema:" +
  "\n" +
  JSON.stringify(zodToJsonSchema(requestSchema), null, 2) +
  "\n\n" +
  "You must determine the correct response type based on the user's prompt and context." +
  "\n" +
  "Do not explain your reasoning or describe possible changes—just apply them.";

export async function POST(request: NextRequest) {
  try {
    const { prompt, context } = requestSchema.parse(await request.json());

    const { object: result } = await generateObject({
      // Use a local model with LM Studio
      model: lmstudio(""),
      // Use Claude with Anthropic
      // model: anthropic("claude-3-5-sonnet-20240620"),
      system,
      prompt: JSON.stringify({ prompt, context }),
      schema: responseSchema,
      maxRetries: 1,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(error);

    return NextResponse.json({ status: 500 });
  }
}
