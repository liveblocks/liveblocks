import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LOCKED_REPO } from "@/lib/repo";
import { hasCursorApiKey, listRepositories } from "@/lib/server/cursor";
import type { ReposResponse } from "@/lib/types";

/**
 * Repositories the agent can work on, for the picker on the new chat
 * screen. These come from Cursor: whatever the Cursor GitHub App has been
 * granted access to for the configured API key.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Not signed in", { status: 401 });
  }

  if (LOCKED_REPO) {
    return NextResponse.json({
      repos: [LOCKED_REPO.url],
    } satisfies ReposResponse);
  }

  if (!hasCursorApiKey()) {
    return NextResponse.json(
      { repos: [], error: "Missing CURSOR_API_KEY" } satisfies ReposResponse,
      { status: 200 }
    );
  }

  try {
    const repos = await listRepositories();
    return NextResponse.json({ repos } satisfies ReposResponse);
  } catch (err) {
    return NextResponse.json({
      repos: [],
      error:
        err instanceof Error
          ? err.message
          : "Could not list repositories from Cursor",
    } satisfies ReposResponse);
  }
}
