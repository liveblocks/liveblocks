import styles from "../../styles/BlockVideo.module.css";
import { TBDBlock } from "../types";
import classNames from "classnames";
import BlockInlineActions from "./BlockInlineActions";
import { LiveObject } from "@liveblocks/client";
import useOthersByBlockId from "../hooks/useOthersByBlockId";
import Avatar from "./Avatar";
import { USER_COLORS } from "../constants";
import { useList } from "../liveblocks.config";
import BlockTypeSelector from "./BlockTypeSelector";

type Props = {
  id: string;
  blockId: string;
  block: LiveObject<TBDBlock>;
};

export default function BlockTBD({ id, blockId, block }: Props) {
  const othersByBlockId = useOthersByBlockId(blockId);
  const blockIds = useList("blockIds");
  const index = blockIds?.findIndex((id) => blockId === id);

  return (
    <div className={styles.block_tbd}>
      {index && (
        <BlockTypeSelector blockId={blockId} placeholder="Type to filter…" />
      )}
      {othersByBlockId.length > 0 && (
        <div className={classNames(styles.avatars, "avatars")}>
          {othersByBlockId.map((user) => {
            return (
              <Avatar
                key={user.connectionId}
                imageUrl={user.info.imageUrl}
                name={user.info.name}
                size="sm"
                color={USER_COLORS[user.connectionId % USER_COLORS.length]}
              />
            );
          })}
        </div>
      )}
      {blockId && (
        <div className={classNames(styles.inline_actions, "inline_actions")}>
          <BlockInlineActions blockId={blockId} />
        </div>
      )}
    </div>
  );
}
