"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";
import styles from "./Avatars.module.css";
import { ClientSideSuspense } from "@liveblocks/react";

export function Avatars() {
  return (
    <ClientSideSuspense fallback={<div />}>
      <AvatarStack />
    </ClientSideSuspense>
  );
}

function AvatarStack() {
  const users = useOthers();
  const currentUser = useSelf();

  return (
    <div className="flex items-center pl-3">
      {currentUser && (
        <div className="relative mr-4">
          <Avatar picture={currentUser.info.picture} name="You" />
        </div>
      )}
      {users.map(({ connectionId, info }) => {
        return (
          <Avatar key={connectionId} picture={info.picture} name={info.name} />
        );
      })}
      <div className="ml-2 text-gray-500 text-sm">
        {users.length + 1} user{users.length ? "s" : ""} editing
      </div>
    </div>
  );
}

export function Avatar({ picture, name }: { picture: string; name: string }) {
  return (
    <div className={styles.avatar} data-tooltip={name}>
      <img
        alt={name}
        src={picture}
        className="w-full h-full rounded-full"
        data-tooltip={name}
      />
    </div>
  );
}
