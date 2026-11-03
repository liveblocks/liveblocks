import type { JsonObject } from "@liveblocks/node";
import { AI_USER } from "@/app/database";
import { liveblocks } from "@/lib/liveblocks-server";

// The assistant has no WebSocket connection, so its Presence is set from the
// server with `liveblocks.setPresence` and expires on its own after `ttl`
// seconds. It uses the same shape as everyone else's Presence (see
// `liveblocks.config.ts`), so the AI shows up in the avatar stack, next to
// the document it's editing in the sidebar, as a caret in text documents,
// and as a cursor on canvases, with no client code specific to it.

export type AiPresence = {
  // Which document the assistant is working on
  docId: string | null;
  // A tldraw `instance_presence` record, for canvases
  tldraw?: JsonObject | null;
  // A caret in a text document, read by `@liveblocks/react-tiptap`
  liveblocksTiptap?: JsonObject;
};

const WORKING_TTL = 20;
// The minimum the API accepts, used to make the presence go away quickly
const HIDE_TTL = 2;

export async function showAiPresence(roomId: string, presence: AiPresence) {
  await setAiPresence(roomId, presence, WORKING_TTL);
}

export async function hideAiPresence(roomId: string) {
  await setAiPresence(roomId, { docId: null, tldraw: null }, HIDE_TTL);
}

async function setAiPresence(
  roomId: string,
  presence: AiPresence,
  ttl: number
) {
  const data: JsonObject = {
    docId: presence.docId,
    tldraw: presence.tldraw ?? null,
  };
  if (presence.liveblocksTiptap) {
    data.liveblocksTiptap = presence.liveblocksTiptap;
  }
  try {
    await liveblocks.setPresence(roomId, {
      userId: AI_USER.id,
      userInfo: { ...AI_USER.info },
      data,
      ttl,
    });
  } catch {
    // Presence is cosmetic: never fail an edit because of it
  }
}

// Caret presence for a text document. Positions are ProseMirror positions,
// which the client clamps to the document, so a huge number means "the end".
export function textCaretPresence(docId: string, position: number): AiPresence {
  return {
    docId,
    liveblocksTiptap: {
      field: docId,
      anchor: position,
      head: position,
      user: { name: AI_USER.info.name, color: AI_USER.info.color },
    },
  };
}

export const END_OF_DOCUMENT = 1_000_000;
