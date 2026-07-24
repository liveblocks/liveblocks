"use client";

import { useMemo } from "react";
import { useOthers, useSelf } from "@liveblocks/react/suspense";
import clsx from "clsx";

type PresenceUser = {
  id: string;
  name: string;
  avatar: string;
};

export function PresenceAvatars() {
  const self = useSelf();
  const others = useOthers();

  const users = useMemo(() => {
    const byId = new Map<string, PresenceUser>();

    for (const other of others) {
      if (!byId.has(other.id)) {
        byId.set(other.id, {
          id: other.id,
          name: other.info.name,
          avatar: other.info.avatar,
        });
      }
    }

    if (self && !byId.has(self.id)) {
      byId.set(self.id, {
        id: self.id,
        name: self.info.name,
        avatar: self.info.avatar,
      });
    }

    return Array.from(byId.values());
  }, [others, self]);

  if (users.length === 0) {
    return null;
  }

  const visible = users.slice(0, 5);
  const overflow = users.length - visible.length;

  return (
    <div className="ml-auto flex items-center">
      <div className="flex items-center">
        {visible.map((user, index) => (
          <img
            key={user.id}
            src={user.avatar}
            alt={user.name}
            title={user.name}
            className={clsx(
              "size-7 rounded-full border-2 border-white bg-neutral-200 object-cover",
              index > 0 && "-ml-2"
            )}
          />
        ))}
      </div>
      {overflow > 0 ? (
        <span className="ml-2 text-xs font-medium text-neutral-500">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
