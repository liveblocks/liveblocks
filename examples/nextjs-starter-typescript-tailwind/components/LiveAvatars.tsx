import React from "react";
import { Avatar } from "./Avatar";
import { useOthers, useSelf } from "@liveblocks/react";
import { AnimatePresence, motion } from "framer-motion";

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

const animationProps = {
  initial: { width: 0, transformOrigin: "left" },
  animate: { width: "auto", height: "auto" },
  exit: { width: 0 },
  transition: {
    type: "spring",
    bounce: 0.6,
    damping: 28,
    mass: 1,
    stiffness: 300,
    restSpeed: 0.01,
  },
};

const avatarProps = {
  style: { marginLeft: "-0.7rem" },
  size: 52,
  outlineWidth: 4,
  outlineColor: "white",
};

export default function LiveAvatars() {
  const users = useOthers().toArray();
  const currentUser = useSelf();
  const hasMoreUsers = users.length > MAX_OTHERS;

  return (
    <div className="flex pl-3 overflow-hidden" style={{ minHeight: avatarProps.size + "px" }}>
      <AnimatePresence>
        {hasMoreUsers ? (
          <motion.div {...animationProps} key="count">
            <Avatar
              {...avatarProps}
              variant="more"
              count={users.length - 3}
            />
          </motion.div>
        ) : null}

        {users.slice(0, MAX_OTHERS).reverse().map(({ connectionId, info }) => (
          <motion.div {...animationProps} key={connectionId}>
            <Avatar
              {...avatarProps}
              picture={info?.picture}
              name={info?.name}
              color={info?.color}
            />
          </motion.div>
        ))}

        {currentUser ? (
          <motion.div {...animationProps} key="you">
            <Avatar
              {...avatarProps}
              picture={currentUser.info?.picture}
              name="You"
              color={currentUser.info?.color}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
