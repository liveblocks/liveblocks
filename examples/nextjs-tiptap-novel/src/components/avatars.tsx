"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";

export function Avatars() {
  const users = useOthers();
  const currentUser = useSelf();

  return (
    <div className="flex px-3">
      {users.map(({ connectionId, info }) => {
        return (
          <Avatar key={connectionId} picture={info.avatar} name={info.name} />
        );
      })}

      {currentUser && (
        <div className="relative">
          <Avatar
            picture={currentUser.info.avatar}
            name={currentUser.info.name}
          />
        </div>
      )}
    </div>
  );
}

export function Avatar({ picture, name }: { picture: string; name: string }) {
  return (
    <div
      className="flex shrink-0 justify-center items-center relative border-4 border-background rounded-full w-9 h-9 bg-gray-400 -ml-3"
      data-tooltip={name}
    >
      <img
        alt={name}
        src={picture}
        className="w-full h-full rounded-full"
        data-tooltip={name}
      />
    </div>
  );
}
