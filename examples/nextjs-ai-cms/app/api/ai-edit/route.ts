import { NextRequest } from "next/server";
import { streamText, Output } from "ai";
import { z } from "zod";
import { aiModel, CMS_AI_DRAFT_FEED_ID } from "../../config";
import { liveblocks } from "../../utils/liveblocks";
import type { CmsPost, CmsAiDraftSnapshot } from "../../../liveblocks.config";
import { CMS_DRAFT_KEYS, fieldPhaseEntriesFromPartial, type PartialDraft } from "../../lib/cms-ai-draft";

export const maxDuration = 60;

const requestSchema = z.object({
  roomId: z.string(),
  prompt: z.string().min(1),
});

const cmsFieldNullable = z.union([z.string(), z.null()]);

const cmsPostSchema = z.object({
  title: cmsFieldNullable,
  slug: cmsFieldNullable,
  excerpt: cmsFieldNullable,
  body: cmsFieldNullable,
  publishedAt: cmsFieldNullable,
});

type CmsAiFields = z.infer<typeof cmsPostSchema>;

function toDraftSnapshot(p: Partial<CmsAiFields> | CmsAiFields): CmsAiDraftSnapshot {
  const out: CmsAiDraftSnapshot = {};
  for (const k of [
    "title",
    "slug",
    "excerpt",
    "body",
    "publishedAt",
  ] as const) {
    const v = p[k];
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

const ROOM_PREFIX = "liveblocks:examples:nextjs-ai-cms:";

function assertRoomAllowed(roomId: string) {
  if (!roomId.startsWith(ROOM_PREFIX)) {
    throw new Error("Invalid room");
  }
}

async function resetDraftFeed(roomId: string) {
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
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  const parsed = requestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const { roomId, prompt } = parsed.data;

  try {
    assertRoomAllowed(roomId);
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await liveblocks.getRoom(roomId);
  } catch {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  await resetDraftFeed(roomId);

  const current = (await liveblocks.getStorageDocument(roomId, "json")) as {
    post: CmsPost;
  };

  await liveblocks.createFeedMessage({
    roomId,
    feedId: CMS_AI_DRAFT_FEED_ID,
    data: { kind: "start", message: prompt },
  });

  await liveblocks.createFeedMessage({
    roomId,
    feedId: CMS_AI_DRAFT_FEED_ID,
    data: {
      kind: "status",
      phase: "preparing",
      message: "Preparing",
    },
  });

  await liveblocks.createFeedMessage({
    roomId,
    feedId: CMS_AI_DRAFT_FEED_ID,
    data: {
      kind: "status",
      phase: "working",
      message: "Reading document",
    },
  });

  await liveblocks.createFeedMessage({
    roomId,
    feedId: CMS_AI_DRAFT_FEED_ID,
    data: {
      kind: "status",
      phase: "generating",
      message: "Generating suggestions",
    },
  });

  const system = `You are proposing edits to a CMS document. Nothing is saved until the user accepts.

Fields:
- title: post headline
- slug: URL slug (lowercase, hyphens)
- excerpt: short summary
- body: main article (markdown allowed)
- publishedAt: ISO date YYYY-MM-DD

Your structured output MUST include every key: title, slug, excerpt, body, publishedAt.
For each key:
- use a **string** for the proposed new value
- use **null** to mean “keep the current value” for that field

Only propose non-null strings for fields the user asked to change or that must change.

Current document JSON:
${JSON.stringify(current.post, null, 2)}`;

  const result = streamText({
    model: aiModel,
    output: Output.object({ schema: cmsPostSchema }),
    system,
    prompt,
  });

  try {
    const merged: PartialDraft = {};

    for await (const partial of result.partialOutputStream) {
      if (!partial) continue;

      liveblocks.createFeedMessage({
        roomId,
        feedId: CMS_AI_DRAFT_FEED_ID,
        data: {
          kind: "partial",
          draft: toDraftSnapshot(partial),
        },
      });

      liveblocks.createFeedMessage({
        roomId,
        feedId: CMS_AI_DRAFT_FEED_ID,
        data: {
          kind: "field_phases",
          fieldPhases: fieldPhaseEntriesFromPartial(partial, false, merged),
        },
      });

      for (const k of CMS_DRAFT_KEYS) {
        if (partial[k] !== undefined) {
          merged[k] = partial[k];
        }
      }
    }

    const final = await result.output;

    await liveblocks.createFeedMessage({
      roomId,
      feedId: CMS_AI_DRAFT_FEED_ID,
      data: {
        kind: "status",
        phase: "finalizing",
        message: "Finalizing",
      },
    });

    await liveblocks.createFeedMessage({
      roomId,
      feedId: CMS_AI_DRAFT_FEED_ID,
      data: {
        kind: "field_phases",
        fieldPhases: fieldPhaseEntriesFromPartial(final, true, merged),
      },
    });

    await liveblocks.createFeedMessage({
      roomId,
      feedId: CMS_AI_DRAFT_FEED_ID,
      data: {
        kind: "complete",
        draft: toDraftSnapshot(final),
      },
    });

    await liveblocks.createFeedMessage({
      roomId,
      feedId: CMS_AI_DRAFT_FEED_ID,
      data: {
        kind: "status",
        phase: "complete",
        message: "Suggestions ready",
      },
    });

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await liveblocks.createFeedMessage({
      roomId,
      feedId: CMS_AI_DRAFT_FEED_ID,
      data: {
        kind: "status",
        phase: "error",
        message,
      },
    });
    await liveblocks.createFeedMessage({
      roomId,
      feedId: CMS_AI_DRAFT_FEED_ID,
      data: {
        kind: "field_phases",
        fieldPhases: CMS_DRAFT_KEYS.map((field) => ({
          field,
          phase: "error" as const,
        })),
      },
    });
    await liveblocks.createFeedMessage({
      roomId,
      feedId: CMS_AI_DRAFT_FEED_ID,
      data: { kind: "error", message },
    });
    return Response.json({ error: message }, { status: 500 });
  }
}
