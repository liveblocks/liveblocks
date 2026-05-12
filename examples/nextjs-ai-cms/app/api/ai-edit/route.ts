import { NextRequest } from "next/server";
import { streamText, Output } from "ai";
import { z } from "zod";
import { aiModel, AI_CMS_USER_ID, CMS_AI_FEED_ID } from "../../config";
import { liveblocks } from "../../utils/liveblocks";
import type { CmsPost, CmsPostPatch } from "../../../liveblocks.config";

export const maxDuration = 60;

const requestSchema = z.object({
  roomId: z.string(),
  prompt: z.string().min(1),
});

// OpenAI structured outputs require `required` to list every key in `properties`
// at each object level. Optional keys / nested partial objects are rejected.
// Use required keys with `string | null`: null means “do not change this field”.
const cmsFieldNullable = z.union([z.string(), z.null()]);

const cmsPostSchema = z.object({
  title: cmsFieldNullable,
  slug: cmsFieldNullable,
  excerpt: cmsFieldNullable,
  body: cmsFieldNullable,
  publishedAt: cmsFieldNullable,
});

type CmsAiFields = z.infer<typeof cmsPostSchema>;

const CMS_KEYS: (keyof CmsPost)[] = [
  "title",
  "slug",
  "excerpt",
  "body",
  "publishedAt",
];

function toStoragePatch(p: Partial<CmsAiFields> | CmsAiFields): CmsPostPatch {
  const out: CmsPostPatch = {};
  for (const k of CMS_KEYS) {
    const v = p[k];
    if (typeof v === "string") {
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

async function ensureCmsAiFeed(roomId: string) {
  try {
    await liveblocks.getFeed({ roomId, feedId: CMS_AI_FEED_ID });
  } catch {
    await liveblocks.createFeed({
      roomId,
      feedId: CMS_AI_FEED_ID,
      metadata: { kind: "cms-ai-editor" },
    });
  }
}

function pickActiveField(p: CmsPostPatch): keyof CmsPost | null {
  const order = ["title", "slug", "excerpt", "publishedAt", "body"] as const;
  let last: keyof CmsPost | null = null;
  for (const k of order) {
    const v = p[k];
    if (typeof v === "string") {
      last = k;
    }
  }
  return last;
}

async function applyPartialToRoom(roomId: string, partial: CmsPostPatch) {
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const post = root.get("post");
    for (const key of CMS_KEYS) {
      const v = partial[key];
      if (typeof v === "string") {
        post.set(key, v);
      }
    }
  });
}

async function setAiFieldPresence(
  roomId: string,
  editingField: keyof CmsPost | null
) {
  await liveblocks.setPresence(roomId, {
    userId: AI_CMS_USER_ID,
    data: {
      cursor: null,
      editingField,
    },
    userInfo: {
      name: "AI Assistant",
      avatar: "https://liveblocks.io/avatars/avatar-8.png",
      color: "#6366f1",
    },
    ttl: 120,
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

  await ensureCmsAiFeed(roomId);

  const current = (await liveblocks.getStorageDocument(roomId, "json")) as {
    post: CmsPost;
  };

  await liveblocks.createFeedMessage({
    roomId,
    feedId: CMS_AI_FEED_ID,
    data: { kind: "start", message: prompt },
  });

  await setAiFieldPresence(roomId, null);

  const system = `You are editing a CMS document. Each field is independent.

Fields:
- title: post headline
- slug: URL slug (lowercase, hyphens)
- excerpt: short summary
- body: main article (markdown allowed)
- publishedAt: ISO date YYYY-MM-DD

Your structured output MUST include every key: title, slug, excerpt, body, publishedAt.
For each key:
- use a **string** to set or replace that field in storage
- use **null** to leave that field unchanged (do not copy the current value as a string unless you are editing it)

Only use non-null values for fields the user asked to change or that must change for their request.

Current document JSON:
${JSON.stringify(current.post, null, 2)}`;

  const result = streamText({
    model: aiModel,
    output: Output.object({ schema: cmsPostSchema }),
    system,
    prompt,
  });

  try {
    for await (const partial of result.partialOutputStream) {
      if (!partial) continue;

      const p = toStoragePatch(partial);
      const active = pickActiveField(p);

      // These three HTTP calls are independent; run them in parallel per chunk.
      await Promise.all([
        applyPartialToRoom(roomId, p),
        setAiFieldPresence(roomId, active),
        liveblocks.createFeedMessage({
          roomId,
          feedId: CMS_AI_FEED_ID,
          data: {
            kind: "partial",
            fields: p,
          },
        }),
      ]);
    }

    const final = await result.output;
    await applyPartialToRoom(roomId, toStoragePatch(final));

    await liveblocks.createFeedMessage({
      roomId,
      feedId: CMS_AI_FEED_ID,
      data: { kind: "complete", fields: toStoragePatch(final) },
    });

    await setAiFieldPresence(roomId, null);

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await liveblocks.createFeedMessage({
      roomId,
      feedId: CMS_AI_FEED_ID,
      data: { kind: "error", message },
    });
    await setAiFieldPresence(roomId, null);
    return Response.json({ error: message }, { status: 500 });
  }
}
