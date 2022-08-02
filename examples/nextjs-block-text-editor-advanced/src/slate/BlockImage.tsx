import styles from "../../styles/BlockImage.module.css";
import VideoIcon from "../icons/video.svg";
import { useState } from "react";
import ImageToolbar from "../components/ImageToolbar";
import { useSlate } from "slate-react";

type Props = {
  id: string;
  url: string;
};

export default function BlockImage({
  id,
  url = "",
}: Props) {
  const [showToolbar, setShowToolbar] = useState(false);
  const editor = useSlate();

  return (
    <div className={styles.block_image}>
      {url ? (
        <div className={styles.image_embed}>
          <img
            src={url}
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
          url={url}
          setUrl={(url) => {
            // TODO: Command to change node's url
            // Look in slate/BlockTextSelector to see format of original object with `url: null`
            console.log("changing url", url);
          }}
          onClose={() => setShowToolbar(false)}
        />
      )}
    </div>
  );
}
