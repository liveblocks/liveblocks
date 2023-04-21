import { Avatar } from "./Avatar";
import { useOthersConnectionIds, useSelf } from "../liveblocks.real.config";
import { AnimatePresence, motion } from "framer-motion";

const animationProps = {
  initial: { width: 0, transformOrigin: "left" },
  animate: { width: "auto", height: "auto" },
  exit: { width: 0 },
  transition: {
    type: "spring",
    damping: 15,
    mass: 1,
    stiffness: 200,
    restSpeed: 0.01,
  },
};

export default function Avatars() {
  const others: number[] = useOthersConnectionIds();
  const currentUser = useSelf();

  return (
    <div className="avatars">
      <AnimatePresence>
        {others.reverse().map((id) => (
          <motion.div key={id} {...animationProps}>
            <Avatar
              picture={`https://liveblocks.io/avatars/avatar-${Math.floor(
                id % 30
              )}.png`}
            />
          </motion.div>
        ))}

        {currentUser ? (
          <motion.div key="you" {...animationProps}>
            <Avatar
              picture={`https://liveblocks.io/avatars/avatar-${Math.floor(
                currentUser.connectionId % 30
              )}.png`}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
