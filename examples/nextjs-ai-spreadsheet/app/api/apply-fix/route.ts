import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { applyReviewFix } from "@/lib/jev-review";

/**
 * Called by the "Fix it" button (see ReviewComment.tsx). The reviewer saved
 * its recommended edits on the comment when it wrote it (`metadata.fix`, see
 * lib/fix.ts), so this just reads them back and applies them to Storage with
 * `mutateStorage` — no model call, the fix lands immediately for everyone.
 *
 * Responds `{ applied: false }` when the comment carries no (remaining) fix,
 * in which case the client falls back to asking the AI in the thread.
 */
export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const { roomId, threadId, commentId } = (await request.json()) as {
    roomId?: string;
    threadId?: string;
    commentId?: string;
  };

  if (
    !roomId?.startsWith("liveblocks:examples:nextjs-ai-spreadsheet") ||
    typeof threadId !== "string" ||
    typeof commentId !== "string"
  ) {
    return new NextResponse("Invalid room, thread or comment", {
      status: 400,
    });
  }

  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
  });

  try {
    const applied = await applyReviewFix(
      liveblocks,
      roomId,
      threadId,
      commentId
    );
    return NextResponse.json({ applied });
  } catch (error) {
    console.error(error);
    return new NextResponse("Could not apply fix", { status: 500 });
  }
}
