import styles from "../../styles/BlockVideo.module.css";
import VideoIcon from "../icons/video.svg";
import { useState } from "react";
import BlockVideoToolbar from "./BlockVideoToolbar";
import { ReactEditor, useSlate } from "slate-react";
import { CustomElement, VideoElement } from "./types";
import { Transforms } from "slate";
import Placeholder from "./Placeholder";

type Props = {
  element: VideoElement;
};

export default function BlockVideo({ element }: Props) {
  const [showToolbar, setShowToolbar] = useState(false);
  const editor = useSlate();

  return (
    <div className={styles.block_video}>
      {element.url ? (
        <div className={styles.video_embed}>
          <iframe
            width="100%"
            height="315"
            src={element.url}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      ) : (
        <Placeholder
          onClick={() => setShowToolbar(true)}
          icon={VideoIcon}
        >
          Embed YouTube video here…
        </Placeholder>
      )}
      {showToolbar && (
        <BlockVideoToolbar
          url={element.url}
          setUrl={(url) => {
            const path = ReactEditor.findPath(editor, element);
            const newProperties: Partial<CustomElement> = {
              url,
            };
            Transforms.setNodes<CustomElement>(editor, newProperties, {
              at: path,
            });
          }}
          onClose={() => setShowToolbar(false)}
        />
      )}
    </div>
  );
}
