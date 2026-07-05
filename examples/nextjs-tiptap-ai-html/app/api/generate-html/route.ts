import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { aiModel } from "../../config";

const requestSchema = z.object({
  prompt: z.string().trim().min(1),
  currentHtml: z.string().optional(),
});

const system =
  "You generate interactive HTML documents for a collaborative rich-text editor.\n\n" +
  "Return ONLY a complete, self-contained HTML5 document. It must include a doctype, html, head with inline <style>, and body with inline <script> when interactivity is useful.\n" +
  "Do not include markdown fences, explanations, comments outside the document, or extra prose.\n" +
  "Do not make external network requests. Do not load external scripts, stylesheets, fonts, images, iframes, or other remote assets. Use a system font stack, emoji, CSS, inline SVG, and vanilla JavaScript only.\n" +
  "Make the result polished and modern. Prefer accessible labels, readable contrast, responsive layout, and concise interactions.\n" +
  "The document runs inside a sandboxed iframe with scripts allowed. Size content to fit naturally; do not use 100vh body height or fixed full-screen layouts.\n" +
  "If the request includes currentHtml, modify that existing document according to the prompt instead of starting over.";

export async function POST(request: NextRequest) {
  try {
    const { prompt, currentHtml } = requestSchema.parse(await request.json());

    const { text } = await generateText({
      model: aiModel,
      system,
      prompt: JSON.stringify({ prompt, currentHtml }),
      maxRetries: 1,
    });

    return NextResponse.json({ html: stripCodeFence(text) });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

function stripCodeFence(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() || trimmed;
}
