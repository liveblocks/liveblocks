import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  DEFAULT_MODEL_ID,
  hasCursorApiKey,
  listModels,
  resolveModelId,
} from "@/lib/server/cursor";

/**
 * Lists the Cursor models the configured API key can use. Populates the
 * model dropdown in the composer.
 */
export async function GET() {
  if (!(await auth())) {
    return new NextResponse("Not signed in", { status: 401 });
  }

  if (!hasCursorApiKey()) {
    return NextResponse.json(
      { error: "Missing CURSOR_API_KEY", defaultModelId: DEFAULT_MODEL_ID },
      { status: 403 }
    );
  }

  try {
    const models = await listModels();
    // Don't hand out a default (from CURSOR_MODEL) the key can't actually use
    const defaultModelId = await resolveModelId(DEFAULT_MODEL_ID);
    return NextResponse.json({ models, defaultModelId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message, defaultModelId: DEFAULT_MODEL_ID },
      { status: 502 }
    );
  }
}
