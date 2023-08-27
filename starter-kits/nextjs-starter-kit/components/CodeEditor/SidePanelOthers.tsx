import { shallow } from "@liveblocks/client";
import { useOthers } from "../../liveblocks.config";
import { AvatarStack } from "../../primitives/AvatarStack";
import styles from "./SidePanelAvatars.module.css";

type Props = {
  fileName: string;
};

const MAX_AVATARS = 2;

export function SidePanelAvatars({ fileName }: Props) {
  const avatarsInFile = useOthers(
    (others) =>
      others
        // Filter those currently in file
        .filter((other) => other.presence.currentFile === fileName)

        // Convert to Avatar format
        .map(({ info }) => ({
          name: info.name,
          color: info.color,
          src: info.avatar,
        })),
    shallow
  );

  return (
    <AvatarStack
      avatars={avatarsInFile}
      size={16}
      className={styles.sidePanelAvatarStack}
    />
  );
}
