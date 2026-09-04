import { NextResponse } from "next/server";
import {
  DEFAULT_MODEL_ID,
  hasCursorApiKey,
  listModels,
} from "@/lib/server/cursor";

/**
 * Lists the Cursor models the configured API key can use. Populates the
 * model dropdown in the composer.
 */
export async function GET() {
  if (!hasCursorApiKey()) {
    return NextResponse.json(
      { error: "Missing CURSOR_API_KEY", defaultModelId: DEFAULT_MODEL_ID },
      { status: 403 }
    );
  }

  try {
    const models = await listModels();
    return NextResponse.json({ models, defaultModelId: DEFAULT_MODEL_ID });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message, defaultModelId: DEFAULT_MODEL_ID },
      { status: 502 }
    );
  }
}
