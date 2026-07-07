import { Liveblocks } from "@liveblocks/node";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";
import { getSlideText, SLIDES_ARRAY_KEY } from "@/app/slide-doc";

/**
 * Replaces a room's entire deck with submitted slide HTML.
 *
 * Example:
 * curl -X POST http://localhost:3000/api/replace-room-html \
 *   -H 'Content-Type: application/json' \
 *   -d '{"roomId":"liveblocks:examples:nextjs-ai-slideshow:demo","slides":["<!doctype html><html><body>Slide</body></html>"]}'
 */

const ROOM_ID_PREFIX = "liveblocks:examples:nextjs-ai-slideshow";

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const body: unknown = await request.json();
  if (!isRecord(body)) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  const roomId = typeof body.roomId === "string" ? body.roomId : "";
  const slides = parseSlides(body.slides);

  if (!roomId.startsWith(ROOM_ID_PREFIX)) {
    return new NextResponse("Invalid room", { status: 400 });
  }
  if (!slides) {
    return new NextResponse("Invalid slides", { status: 400 });
  }

  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
  });

  const slideIds = await replaceRoomDeck(liveblocks, roomId, slides);
  return NextResponse.json({ ok: true, slideIds });
}

async function replaceRoomDeck(
  liveblocks: Liveblocks,
  roomId: string,
  slideHtml: string[]
) {
  const binaryUpdate = await liveblocks.getYjsDocumentAsBinaryUpdate(roomId);
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, new Uint8Array(binaryUpdate));

  const stateVectorBefore = Y.encodeStateVector(ydoc);
  const slides = ydoc.getArray<string>(SLIDES_ARRAY_KEY);
  const slideIds: string[] = [];

  ydoc.transact(() => {
    if (slides.length > 0) {
      slides.delete(0, slides.length);
    }

    for (const html of slideHtml) {
      const id = nanoid(8);
      slideIds.push(id);
      slides.push([id]);
      getSlideText(ydoc, id).insert(0, html);
    }
  });

  const incrementalUpdate = Y.encodeStateAsUpdate(ydoc, stateVectorBefore);
  await liveblocks.sendYjsBinaryUpdate(roomId, incrementalUpdate);

  return slideIds;
}

function parseSlides(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  const slides: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0) {
      return undefined;
    }
    slides.push(item);
  }

  return slides;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
