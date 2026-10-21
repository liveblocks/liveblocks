import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { reviewCellEdits, type ChangedCell } from "@/lib/jev-review";

/**
 * Called by the client (see Table.tsx) shortly after a human edits cells. The
 * body only says *which* cells changed; the server re-reads Storage and the
 * threads itself, asks Jev whether anything is wrong with each cell, and
 * leaves a review comment when something fires (see lib/jev-review.ts).
 *
 * Fire-and-forget from the client's point of view: the review runs to
 * completion here, and its result shows up as a comment in the room.
 */
export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const { roomId, cells } = (await request.json()) as {
    roomId?: string;
    cells?: ChangedCell[];
  };

  if (
    !roomId?.startsWith("liveblocks:examples:nextjs-ai-spreadsheet") ||
    !Array.isArray(cells) ||
    cells.some(
      (cell) =>
        typeof cell?.rowId !== "string" || typeof cell?.colId !== "string"
    )
  ) {
    return new NextResponse("Invalid room or cells", { status: 400 });
  }
  if (cells.length === 0) {
    return NextResponse.json({ ok: true, reviewed: 0 });
  }

  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
  });

  try {
    await reviewCellEdits(liveblocks, roomId, cells);
  } catch (error) {
    console.error(error);
  }

  return NextResponse.json({ ok: true, reviewed: cells.length });
}
