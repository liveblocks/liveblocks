"use client";

import { useSelf, useUpdateMyPresence } from "@liveblocks/react/suspense";
import { useCallback } from "react";
import {
  EMPTY_STATUS,
  normalizeStatus,
  type UserStatus,
  writeStatus,
} from "@/lib/status";

export function useUserStatus() {
  const userId = useSelf((me) => me.id);
  const status = useSelf((me) => me.presence.status) ?? EMPTY_STATUS;
  const updateMyPresence = useUpdateMyPresence();

  const setStatus = useCallback(
    (patch: Partial<UserStatus>) => {
      const next = normalizeStatus({ ...status, ...patch });
      updateMyPresence({ status: next });
      writeStatus(userId, next);
    },
    [status, updateMyPresence, userId]
  );

  const clearStatus = useCallback(() => {
    setStatus({ emoji: null, text: "" });
  }, [setStatus]);

  const setAway = useCallback(
    (away: boolean) => {
      setStatus({ away });
    },
    [setStatus]
  );

  return { status, setStatus, clearStatus, setAway };
}
