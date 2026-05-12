import { NextRequest } from "next/server";
import { z } from "zod";
import { CMS_AI_DRAFT_FEED_ID } from "../../../config";
import { liveblocks } from "../../../utils/liveblocks";

const bodySchema = z.object({ roomId: z.string() });

const ROOM_PREFIX = "liveblocks:examples:nextjs-ai-cms:";

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const { roomId } = parsed.data;
  if (!roomId.startsWith(ROOM_PREFIX)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await liveblocks.deleteFeed({ roomId, feedId: CMS_AI_DRAFT_FEED_ID });
  } catch {
    // Feed may not exist
  }

  await liveblocks.createFeed({
    roomId,
    feedId: CMS_AI_DRAFT_FEED_ID,
    metadata: { kind: "cms-ai-draft" },
  });

  return Response.json({ ok: true });
}
