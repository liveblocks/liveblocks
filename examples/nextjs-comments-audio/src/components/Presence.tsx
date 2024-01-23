"use client";

import { PresenceStates, useOthers, useSelf } from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { Pause as PauseIcon, Play as PlayIcon } from "react-feather";

export function Presence() {
  return (
    <ClientSideSuspense fallback={null}>{() => <Avatars />}</ClientSideSuspense>
  );
}

function Avatars() {
  const users = useOthers();
  const currentUser = useSelf();

  return (
    <div className="flex">
      <div className="flex [&>div]:-ml-1.5 [&>div]:border-2 [&>div]:border-background">
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
    <div className="shrink-0 relative rounded-full" data-tooltip={name}>
      <img
        src={src}
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
        alt={name}
      />
      <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center justify-center bg-inverse shadow rounded-full size-5">
        {state === "playing" ? (
          <PlayIcon className="size-2.5 text-transparent fill-icon" />
        ) : (
          <PauseIcon className="size-2.5 text-transparent fill-icon" />
        )}
      </span>
    </div>
  );
}
