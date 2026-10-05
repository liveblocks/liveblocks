"use client";

import { shallow } from "@liveblocks/react";
import { useOthersMapped, useSelf } from "@liveblocks/react/suspense";
import { useMemo } from "react";
import { isActive, type UserStatus } from "./status";

export type UserPresence = {
  online: boolean;
  status: UserStatus | undefined;
};

type PresenceEntry = readonly [id: string, status: UserStatus | undefined];

export function useUserPresence(): Map<string, UserPresence> {
  const self = useSelf(
    (me): PresenceEntry => [me.id, me.presence.status],
    shallow
  );
  const others = useOthersMapped(
    (other): PresenceEntry => [other.id, other.presence.status],
    shallow
  );

  return useMemo(() => {
    const presence = new Map<string, UserPresence>();
    const add = ([id, status]: PresenceEntry) => {
      const existing = presence.get(id);
      presence.set(id, {
        online: (existing?.online ?? false) || isActive(status),
        status: status ?? existing?.status,
      });
    };
    add(self);
    for (const [, entry] of others) {
      add(entry);
    }
    return presence;
  }, [others, self]);
}
