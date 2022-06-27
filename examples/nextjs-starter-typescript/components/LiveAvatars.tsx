import React from "react";
import { Avatar } from "./Avatar";
import { useOthers, useSelf } from "@liveblocks/react";

/**
 * This file shows how to add live avatars like you can see them at the top right of a Google Doc or a Figma file.
 * https://liveblocks.io/docs/examples/live-avatars
 *
 * The users picture and name are not set via the `useMyPresence` hook like the cursors.
 * They are set from the authentication endpoint.
 *
 * See pages/api/auth.ts and https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
 */

const MAX_OTHERS = 3;

const avatarProps = {
  style: { marginLeft: "-0.45rem" },
  size: 48,
  outlineWidth: 4,
  outlineColor: "white",
};

export default function LiveAvatars() {
  const users = useOthers().toArray();
  const currentUser = useSelf();
  const hasMoreUsers = users.length > MAX_OTHERS;

  return (
    <div
      style={{
        minHeight: avatarProps.size + "px",
        display: "flex",
        paddingLeft: "0.75rem",
        overflow: "hidden",
      }}
    >
        {hasMoreUsers ? (
          <Avatar
            key="count"
            variant="more"
            count={users.length - 3}
            {...avatarProps}
          />
        ) : null}

        {users
          .slice(0, MAX_OTHERS)
          .reverse()
          .map(({ connectionId, info }) => (
            <Avatar
              key={connectionId}
              picture={info?.picture}
              name={info?.name}
              color={info?.color}
              {...avatarProps}
            />
          ))}

        {currentUser ? (
          <Avatar
            key="you"
            picture={currentUser.info?.picture}
            name={currentUser.info?.name + " (you)"}
            color={currentUser.info?.color}
            {...avatarProps}
          />
        ) : null}
    </div>
  );
}
