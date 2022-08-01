import styles from "../../styles/BlockVideo.module.css";
import { VideoBlock } from "../types";
import classNames from "classnames";
import BlockInlineActions from "./BlockInlineActions";
import { LiveObject } from "@liveblocks/client";
import VideoIcon from "../icons/video.svg";
import useOthersByBlockId from "../hooks/useOthersByBlockId";
import Avatar from "./Avatar";
import { USER_COLORS } from "../constants";
import { useState } from "react";
import VideoToolbar from "./VideoToolbar";

type Props = {
  id: string;
  blockId: string;
  block: LiveObject<VideoBlock>;
  data: VideoBlock;
  placeholder?: string;
};

export default function BlockVideo({
  blockId,
  block,
  data,
}: Props) {
  const othersByBlockId = useOthersByBlockId(blockId);
  const [showToolbar, setShowToolbar] = useState(false);

  return (
    <div className={styles.block_video}>
      {data.url ? (
        <div className={styles.video_embed}>
          <iframe
            width="100%"
            height="315"
            src={data.url}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      ) : (
        <button
          className={styles.placeholder}
          onClick={() => setShowToolbar(true)}
        >
          <VideoIcon />
          <span className={styles.placeholder_text}>Embed video here…</span>
        </button>
      )}
      {showToolbar && (
        <VideoToolbar
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
