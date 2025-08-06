"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";
import { memo } from "react";

export function Avatars() {
  const users = useOthers();
  const currentUser = useSelf();

  return (
    <div className="flex px-3">
      {users.map(({ connectionId, info }) => {
        return info?.avatar ? (
          <Avatar key={connectionId} picture={info.avatar} name={info.name} />
        ) : null;
      })}

      {currentUser?.info?.avatar && (
        <div className="relative ml-8 first:ml-0">
          <Avatar
            picture={currentUser.info.avatar}
            name={currentUser.info.name}
          />
        </div>
      )}
    </div>
  );
}

export const Avatar = memo(function Avatar({
  picture,
  name,
}: {
  picture: string;
  name: string;
}) {
  return (
    <div
      className="flex flex-shrink-0 place-content-center relative border-3 border-white rounded-full w-12 h-12 bg-gray-400 -ml-3 before:content-[attr(data-tooltip)] before:absolute before:top-full before:opacity-0 before:transition-opacity before:duration-150 before:ease-in-out before:py-1 before:px-2 before:text-white before:text-xs before:rounded-lg before:mt-2 before:z-10 before:bg-text before:whitespace-nowrap hover:before:opacity-100"
      data-tooltip={name}
    >
      <img
        src={picture}
        className="w-full h-full rounded-full"
        data-tooltip={name}
        alt={name}
      />
    </div>
  );
});
