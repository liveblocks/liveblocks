"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRoom } from "@liveblocks/react/suspense";
import type { ChangeSource } from "handsontable/common";
import { cellKey } from "@/liveblocks.config";

// How long to wait after the last edit before asking for a review, so a burst
// of edits (typing across a row, a fill-down) becomes one request.
const REVIEW_DEBOUNCE_MS = 1500;

// Only edits a human made in this grid are reviewed. Remote changes (other
// users, the AI's server-side `mutateStorage`) arrive via the `data` prop and
// use `loadData`/`updateData`, so they never match this list.
const HUMAN_SOURCES = new Set<ChangeSource>([
  "edit",
  "CopyPaste.paste",
  "Autofill.fill",
]);

export function isHumanEdit(source: ChangeSource): boolean {
  return HUMAN_SOURCES.has(source);
}

export type ReviewableChange = {
  rowId: string;
  colId: string;
  previousValue: string;
};

/**
 * Asks the server to run the Jev-powered review (see lib/jev-review.ts) on
 * cells the current user just edited. Fire-and-forget: the result, if any,
 * arrives as a comment on the cell through the normal realtime channel.
 */
export function useJevReview() {
  const room = useRoom();
  const pending = useRef(new Map<string, ReviewableChange>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    timer.current = null;
    const cells = [...pending.current.values()];
    pending.current.clear();
    if (cells.length === 0) {
      return;
    }
    fetch("/api/jev-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, cells }),
      keepalive: true,
    }).catch(() => {
      // The reviewer is best-effort; a failed request just means no comment.
    });
  }, [room.id]);

  const queueReview = useCallback(
    (changes: ReviewableChange[]) => {
      for (const change of changes) {
        const key = cellKey(change.rowId, change.colId);
        // Keep the *first* previous value of a burst, so the server sees the
        // value before the user started editing, not an intermediate one.
        const existing = pending.current.get(key);
        pending.current.set(key, existing ?? change);
      }
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(flush, REVIEW_DEBOUNCE_MS);
    },
    [flush]
  );

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    []
  );

  return queueReview;
}
