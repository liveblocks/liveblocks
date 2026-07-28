import type { JsonObject, Liveblocks } from "@liveblocks/node";
import {
  AI_USER_AVATAR,
  AI_USER_COLOR,
  AI_USER_ID,
  AI_USER_NAME,
} from "@/app/database";
import type { DocumentSelection } from "./document";

const CARET_TTL_SECONDS = 30;
const CLEAR_TTL_SECONDS = 4;

const AI_CURSOR_USER = { name: AI_USER_NAME, color: AI_USER_COLOR };

const AI_USER_INFO = {
  name: AI_USER_NAME,
  color: AI_USER_COLOR,
  avatar: AI_USER_AVATAR,
};

export type EditorPresence = {
  show: (selection: DocumentSelection) => Promise<void>;
  clear: () => Promise<void>;
};

/**
 * Creates the presence helpers for one room and document field
 */
export function createEditorPresence(
  liveblocks: Liveblocks,
  roomId: string,
  field: string
): EditorPresence {
  const setPresence = (data: JsonObject, ttl: number) =>
    liveblocks
      .setPresence(roomId, {
        userId: AI_USER_ID,
        data,
        userInfo: AI_USER_INFO,
        ttl,
      })
      .catch(() => {});

  return {
    show: (selection) =>
      setPresence(
        {
          liveblocksTiptap: {
            field,
            anchor: selection.anchor,
            head: selection.head,
            user: AI_CURSOR_USER,
          },
        },
        CARET_TTL_SECONDS
      ),
    clear: () => setPresence({ liveblocksTiptap: null }, CLEAR_TTL_SECONDS),
  };
}
