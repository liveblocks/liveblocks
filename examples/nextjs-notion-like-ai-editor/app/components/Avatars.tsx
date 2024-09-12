"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";
import { ClientSideSuspense } from "@liveblocks/react";

export function Avatars() {
  return (
    <ClientSideSuspense
      fallback={
        // Fallback as Liveblocks loads
        <div className="flex items-center">
          <div className="relative ml-2">
            <AvatarPlaceholder />
          </div>
          <div className="ml-2 text-gray-500 text-sm select-none">
            1 user editing
          </div>
        </div>
      }
    >
      <AvatarStack />
    </ClientSideSuspense>
  );
}

const AVATAR_SIZE = 36;

// Get all currently connected users and render a live avatar stack
function AvatarStack() {
  const users = useOthers();
  const currentUser = useSelf();

  return (
    <div className="flex items-center">
      {/* Your avatar */}
      {currentUser && (
        <div className="relative ml-2">
          <Avatar src={currentUser.info.avatar} name="You" />
        </div>
      )}

      {/* Others' avatars */}
      <div className="flex">
        {users.map(({ connectionId, info }) => {
          return (
            <Avatar key={connectionId} src={info.avatar} name={info.name} />
          );
        })}
      </div>

      <div className="ml-2 text-gray-500 text-sm select-none">
        {users.length + 1} user{users.length ? "s" : ""} editing
      </div>
    </div>
  );
}

export function Avatar({ src, name }: { src: string; name: string }) {
  return (
    <div
      style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
      className="group -ml-2 flex shrink-0 place-content-center relative border-4 border-white rounded-full bg-gray-400"
      data-tooltip={name}
    >
      <div className="opacity-0 group-hover:opacity-100 absolute top-full py-1 px-2 text-white text-xs rounded-lg mt-2.5 z-10 bg-black whitespace-nowrap transition-opacity">
        {name}
      </div>
      <img
        alt={name}
        src={src}
        className="w-full h-full rounded-full"
        data-tooltip={name}
      />
    </div>
  );
}

export function AvatarPlaceholder() {
  return (
    <div
      style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
      className="group -ml-2 flex shrink-0 place-content-center relative border-4 border-white rounded-full bg-gray-400"
    >
      <div className="w-full h-full rounded-full bg-neutral-200" />
    </div>
  );
}
