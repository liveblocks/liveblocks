import React from "react";
import { Avatar } from "./Avatar";
import { useOthers, useSelf } from "@liveblocks/react";
import styles from "./Avatar.module.css";
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

export default function LiveAvatars() {
  const users = useOthers().toArray();
  const currentUser = useSelf();
  const hasMoreUsers = users.length > MAX_OTHERS;

  return (
    <div className="flex flex-row-reverse pl-3">
      <AnimatePresence>
        {hasMoreUsers && (
          <motion.div {...animationProperties} key="count">
            <div key="more" className={styles.more}>+{users.length - 3}</div>
          </motion.div>
        )}

        {users.slice(0, MAX_OTHERS).map(({ connectionId, info }) => (
          <motion.div {...animationProperties} key={connectionId}>
            <Avatar
              picture={info?.picture}
              name={info?.name}
            />
          </motion.div>
        ))}

        {currentUser && (
          <motion.div {...animationProperties} key="you">
            <Avatar picture={currentUser.info?.picture} name="You" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Strange bug with below, possibly to do with flex rendering

/*
import React, { ReactNode } from "react";
import { Avatar } from "./Avatar";
import { useOthers, useSelf } from "@liveblocks/react";
import styles from "./Avatar.module.css";
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

export default function LiveAvatars() {
  const users = useOthers().toArray();
  const currentUser = useSelf();
  const hasMoreUsers = users.length > MAX_OTHERS;

  return (
    <div className="flex pl-3 isolate">
      <AnimatePresence>
        {currentUser && (
          <motion.div {...animationProperties} key="you" style={{ zIndex: MAX_OTHERS + 2 }}>
            <Avatar picture={currentUser.info?.picture} name="You" />
          </motion.div>
        )}

        {users.slice(0, MAX_OTHERS).map(({ connectionId, info }, index) => (
          <motion.div {...animationProperties} key={connectionId} style={{ zIndex: MAX_OTHERS + 1 - index }}>
            <Avatar
              picture={info?.picture}
              name={info?.name}
            />
          </motion.div>
        ))}

        {hasMoreUsers && (
          <motion.div {...animationProperties} key="count" style={{ zIndex: 1 }}>
            <div key="more" className={styles.more}>+{users.length - 3}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

 */
