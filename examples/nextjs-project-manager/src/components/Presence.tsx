"use client";

import {
  useOthers,
  useSelf,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { PresenceStates } from "@/liveblocks.config";

export function Presence() {
  return (
    <ClientSideSuspense fallback={null}>
      <Avatars />
    </ClientSideSuspense>
  );
}

function Avatars() {
  const users = useOthers();
  const currentUser = useSelf();

  return (
    <div className="flex">
      <div className="flex [&>div]:-ml-1.5">
        {users.map(({ connectionId, info, presence }) => {
          return (
            <Avatar
              key={connectionId}
              src={info.avatar}
              name={info.name}
              state={presence.state}
            />
          );
        })}
      </div>

      {currentUser && (
        <div className="relative ml-3 first:ml-0">
          <Avatar
            src={currentUser.info.avatar}
            name={currentUser.info.name}
            state={currentUser.presence.state}
          />
        </div>
      )}
    </div>
  );
}

type AvatarProps = { src: string; name: string; state: PresenceStates };

function Avatar({ src, name, state }: AvatarProps) {
  return (
    <div className="shrink-0 relative rounded-full border-2 border-neutral-50">
      <img src={src} className="w-7 h-7 rounded-full" alt={name} />
    </div>
  );
}
