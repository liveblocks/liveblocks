/**
 * This file shows how to add live avatars like you can see them at the top right of a Google Doc or a Figma file.
 * https://preview.liveblocks.io/docs/examples/live-avatars
 *
 * The users picture and name are not set via the `useMyPresence` hook like the cursors.
 * They are set from the authentication endpoint.
 *
 * See pages/api/auth.ts and https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
 */

import { RoomProvider, useOthers, useSelf } from "@liveblocks/react";
import React from "react";
import styles from "./avatars.module.css";
import ExampleInfo from "../components/ExampleInfo";

const IMAGE_SIZE = 48;

export default function Root() {
  return (
    <RoomProvider id="example-live-avatars">
      <Demo />
      <ExampleInfo
        title="Live Avatars"
        description="Open this page in multiple windows to see the live avatars."
        githubHref="https://github.com/liveblocks/next-js-examples/blob/main/pages/avatars.js"
        codeSandboxHref="https://codesandbox.io/s/github/liveblocks/next-js-examples?file=/pages/avatars.js"
      />
    </RoomProvider>
  );
}

function Demo() {
  const users = useOthers().toArray();
  const currentUser = useSelf();
  const hasMoreUsers = users.length > 3;

  return (
    <main className={styles.main}>
      <div className={styles.avatars}>
        {users.slice(0, 3).map(({ connectionId, info }) => {
          return (
            <Avatar
              key={connectionId}
              picture={info?.picture}
              name={info?.name}
            />
          );
        })}

        {hasMoreUsers && <div className={styles.more}>+{users.length - 3}</div>}

        {currentUser && (
          <div className={styles.current_user_container}>
            <Avatar picture={currentUser.info?.picture} name="You" />
          </div>
        )}
      </div>
    </main>
  );
}

function Avatar({ picture, name }) {
  return (
    <div className={styles.avatar} data-tooltip={name}>
      <img
        src={picture}
        height={IMAGE_SIZE}
        width={IMAGE_SIZE}
        className={styles.avatar_picture}
      />
    </div>
  );
}
