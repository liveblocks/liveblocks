import { shallow } from "@liveblocks/client";
import { useOthers } from "../../liveblocks.config";
import { Avatar, AvatarEllipsis } from "../../primitives/Avatar";
import styles from "./SidePanelAvatars.module.css";

type Props = {
  fileName: string;
};

const MAX_AVATARS = 2;

export function SidePanelAvatars({ fileName }: Props) {
  const othersInFile = useOthers(
    (others) =>
      others.filter((other) => other.presence.currentFile === fileName),
    shallow
  );

  return (
    <div className={styles.sidePanelAvatars}>
      {othersInFile.slice(0, MAX_AVATARS).map((other) => (
        <Avatar
          size={20}
          key={other.connectionId}
          className={styles.sidePanelAvatar}
          name={other.info.name}
          color={other.info.color}
          src={other.info.avatar}
        />
      ))}

      {othersInFile.length > MAX_AVATARS ? (
        <AvatarEllipsis
          size={20}
          className={styles.sidePanelAvatar}
          ellipsis={othersInFile.length - MAX_AVATARS}
        />
      ) : null}
    </div>
  );
}
