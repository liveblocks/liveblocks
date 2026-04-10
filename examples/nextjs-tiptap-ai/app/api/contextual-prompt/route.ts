import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import * as z from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const responseSchema = z.object({
  type: z.enum(["insert", "replace", "other"]),
  text: z.string(),
});

const requestSchema = z.object({
  prompt: z.string(),
  context: z.object({
    beforeSelection: z.string(),
    selection: z.string(),
    afterSelection: z.string(),
  }),
  previous: z
    .object({
      prompt: z.string(),
      response: responseSchema,
    })
    .optional(),
});

const system =
  "You are a helpful AI assistant in a text editor.\n\n" +
  "The user will provide a JSON request with the following schema:\n" +
  JSON.stringify(zodToJsonSchema(requestSchema as any), null, 2) +
  "\n\n" +
  "Determine the correct response type and return ONLY the structured response.";

export async function POST(request: NextRequest) {
  try {
    const { prompt, context, previous } = requestSchema.parse(
      await request.json()
    );

    const { output } = await generateText({
      model: anthropic("claude-3-5-sonnet-20240620"),
      system,
      prompt: JSON.stringify({ prompt, context, previous }),
      output: Output.object({
        schema: responseSchema as any,
      }),
      maxRetries: 1,
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
