"use client";

import { useOthers } from "@liveblocks/react/suspense";
import { getBotUserId } from "../lib/users";

export type AiTablePresence = {
  aiStatus: string;
  /** Inclusive start row (0-based). */
  focusedRowIndex: number | null;
  /** Inclusive end; null means single row at focusedRowIndex. */
  focusedRowIndexEnd: number | null;
};

/**
 * Bot presence from @liveblocks/node setPresence (same userId as comments bot).
 */
export function useAiTablePresence(): AiTablePresence | null {
  const botId = getBotUserId();

  return useOthers((others) => {
    const bot = others.find((o) => o.id === botId);
    if (!bot?.presence) return null;

    const { aiStatus, aiFocusedRowIndex, aiFocusedRowIndexEnd } = bot.presence;
    if (typeof aiStatus !== "string" || aiStatus.length === 0) {
      return null;
    }

    const start =
      typeof aiFocusedRowIndex === "number" ? aiFocusedRowIndex : null;
    const end =
      typeof aiFocusedRowIndexEnd === "number"
        ? aiFocusedRowIndexEnd
        : null;

    return {
      aiStatus,
      focusedRowIndex: start,
      focusedRowIndexEnd: end,
    };
  });
}
