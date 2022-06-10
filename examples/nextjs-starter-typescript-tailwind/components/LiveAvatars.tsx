import React from "react";
import { Avatar } from "./Avatar";
import { useOthers, useSelf } from "@liveblocks/react";
import { AnimatePresence, motion } from "framer-motion";

const MAX_OTHERS = 3;

const animationProperties = {
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

type Props = {
  height?: number;
}

export default function LiveAvatars({ height = 42 }: Props) {
  const users = useOthers().toArray();
  const currentUser = useSelf();
  const hasMoreUsers = users.length > MAX_OTHERS;

  return (
    <div className="flex pl-3 overflow-hidden" style={{ minHeight: height + "px" }}>
      <AnimatePresence>
        {hasMoreUsers ? (
          <motion.div {...animationProperties} key="count">
            <Avatar
              variant="more"
              size={height}
              count={users.length - 3}
            />
          </motion.div>
        ) : null}

        {users.slice(0, MAX_OTHERS).reverse().map(({ connectionId, info }) => (
          <motion.div {...animationProperties} key={connectionId}>
            <Avatar
              size={height}
              picture={info?.picture}
              name={info?.name}
              color={info?.color}
            />
          </motion.div>
        ))}

        {currentUser ? (
          <motion.div {...animationProperties} key="you">
            <Avatar
              size={height}
              picture={currentUser.info?.picture}
              color={currentUser.info?.color}
              name="You"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
