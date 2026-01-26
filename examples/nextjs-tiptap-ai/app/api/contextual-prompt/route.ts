import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import * as z from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

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
    previous: z
      .object({
        prompt: z.string().describe("A description of the user's request"),
        response: responseSchema,
      })
      .optional()
      .describe(
        "The previous request and its response, present when this request is a follow-up."
      ),
  })
  .describe("The user's request and context");

const system =
  "You are an helpful AI assistant in a text editor." +
  "\n\n" +
  "The user will provide a JSON request with the following schema:" +
  "\n" +
  JSON.stringify(zodToJsonSchema(requestSchema as any), null, 2) +
  "\n\n" +
  "You must determine the correct response type based on the user's prompt and context." +
  "\n" +
  "If the user's request is a follow-up to a previous request, you must take the previous request and its response into account for your response." +
  "\n" +
  "Do not explain your reasoning or describe possible changes—just apply them.";

export async function POST(request: NextRequest) {
  try {
    const { prompt, context, previous } = requestSchema.parse(
      await request.json()
    );

    const { object: result } = await generateObject({
      model: anthropic("claude-3-5-sonnet-20240620"),
      system,
      prompt: JSON.stringify({ prompt, context, previous }),
      schema: responseSchema,
      maxRetries: 1,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(error);

    return NextResponse.json({ status: 500 });
  }
}
