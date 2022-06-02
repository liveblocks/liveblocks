import React from "react";
import styles from "./Avatar.module.css";

/**
 * This file shows how to add live avatars like you can see them at the top right of a Google Doc or a Figma file.
 * https://liveblocks.io/docs/examples/live-avatars
 *
 * The users picture and name are not set via the `useMyPresence` hook like the cursors.
 * They are set from the authentication endpoint.
 *
 * See pages/api/auth.ts and https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
 */

const IMAGE_SIZE = 48;

type Props = {
  picture: string;
  name: string;
}

export function Avatar({ picture, name }: Props) {
  return (
    <div className={styles.avatar} data-tooltip={name}>
      <img
        alt={name}
        src={picture}
        height={IMAGE_SIZE}
        width={IMAGE_SIZE}
        className={styles.avatar_picture}
      />
    </div>
  );
}
