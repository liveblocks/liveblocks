import styles from "../../styles/BlockImage.module.css";
import { ImageBlock } from "../types";
import classNames from "classnames";
import BlockInlineActions from "./BlockInlineActions";
import { LiveObject } from "@liveblocks/client";
import VideoIcon from "../icons/video.svg";
import useOthersByBlockId from "../hooks/useOthersByBlockId";
import Avatar from "./Avatar";
import { USER_COLORS } from "../constants";
import { useState } from "react";
import ImageToolbar from "./ImageToolbar";

type Props = {
  id: string;
  blockId: string;
  block: LiveObject<ImageBlock>;
  data: ImageBlock;
  placeholder?: string;
};

export default function BlockImage({
  blockId,
  block,
  data,
}: Props) {
  const othersByBlockId = useOthersByBlockId(blockId);
  const [showToolbar, setShowToolbar] = useState(false);

  return (
    <div className={styles.block_image}>
      {data.url ? (
        <div className={styles.image_embed}>
          <img
            src={data.url}
            alt=""
          />
        </div>
      ) : (
        <button
          className={styles.placeholder}
          onClick={() => setShowToolbar(true)}
        >
          <VideoIcon />
          <span className={styles.placeholder_text}>Embed image here…</span>
        </button>
      )}
      {showToolbar && (
        <ImageToolbar
          url={data.url}
          setUrl={(url) => {
            block.set("url", url);
          }}
          onClose={() => setShowToolbar(false)}
        />
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
