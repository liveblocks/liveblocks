"use client";

import { useSelf } from "@liveblocks/react";

export function useLiveblocksDashboardUser() {
  return useSelf((me) =>
    me
      ? {
          id: me.id,
          name: me.info.name,
          avatar: me.info.avatar,
          color: me.info.color,
        }
      : null
  );
}
