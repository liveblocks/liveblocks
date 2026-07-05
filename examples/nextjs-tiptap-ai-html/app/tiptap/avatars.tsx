"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";

export function Avatars() {
  const self = useSelf();
  const others = useOthers();
  const users = [
    ...(self ? [{ connectionId: "self", info: self.info }] : []),
    ...others.map((other) => ({
      connectionId: other.connectionId,
      info: other.info,
    })),
  ];

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center">
      {users.slice(0, 5).map((user, index) => (
        <img
          key={user.connectionId}
          src={user.info.avatar}
          alt={user.info.name}
          title={user.info.name}
          className="-ml-2 size-8 rounded-full border-2 border-background bg-muted first:ml-0"
          style={{
            boxShadow: `0 0 0 2px ${user.info.color}`,
            zIndex: users.length - index,
          }}
        />
      ))}
      {users.length > 5 ? (
        <div className="-ml-2 flex size-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground">
          +{users.length - 5}
        </div>
      ) : null}
    </div>
  );
}
