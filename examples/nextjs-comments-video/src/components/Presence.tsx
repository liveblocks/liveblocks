"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";
import { PresenceStates } from "@/liveblocks.config";
import styles from "./Presence.module.css";
import { PauseIcon } from "@/icons/Pause";
import { PlayIcon } from "@/icons/Play";
import { ClientSideSuspense } from "@liveblocks/react";

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
    <div className={styles.avatars}>
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

      {currentUser && (
        <div className="relative ml-8 first:ml-0">
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
    <div className={styles.avatar} data-tooltip={name}>
      <img src={src} className={styles.avatar_picture} alt={name} />
      <span className={styles.avatar_icon}>
        {state === "playing" ? <PlayIcon /> : <PauseIcon />}
      </span>
    </div>
  );
}
