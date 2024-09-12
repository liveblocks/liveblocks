"use client";

import {
  useOthers,
  useSelf,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";

export function Presence() {
  return (
    <ClientSideSuspense
      fallback={
        <div className="w-7 h-7 bg-neutral-100 aniamte-pulse rounded-full" />
      }
    >
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
            <Avatar key={connectionId} src={info.avatar} name={info.name} />
          );
        })}
      </div>

      {currentUser && (
        <div className="relative ml-3 first:ml-0">
          <Avatar src={currentUser.info.avatar} name={currentUser.info.name} />
        </div>
      )}
    </div>
  );
}

type AvatarProps = { src: string; name: string };

function Avatar({ src, name }: AvatarProps) {
  return (
    <div className="shrink-0 relative rounded-full border-2 border-neutral-50">
      <img src={src} className="w-7 h-7 rounded-full" alt={name} />
    </div>
  );
}
