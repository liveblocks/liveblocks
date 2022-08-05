import styles from "./BlockVideo.module.css";
import VideoIcon from "../icons/video.svg";
import { ReactEditor, useSlate } from "slate-react";
import { CustomElement, VideoElement } from "../types";
import { Transforms } from "slate";
import Placeholder from "../components/Placeholder";

type Props = {
  element: VideoElement;
};

export default function BlockVideo({ element }: Props) {
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
          icon={VideoIcon}
          text="Embed a YouTube video"
          inputs={{
            url: {
              type: "url",
              icon: VideoIcon,
              placeholder: "Paste YouTube video link…",
              title: "Please enter a valid YouTube video link",
              required: true,
              pattern:
                "^((?:https?:)?//)?((?:www|m)\\.)?((?:youtube(-nocookie)?\\.com|youtu.be))(/(?:[\\w\\-]+\\?v=|embed/|v/)?)([\\w\\-]+)(\\S+)?$",
            },
          }}
          onSubmit={({ url }) => {
            if (!url.includes("/embed/")) {
              const id = new URL(url).searchParams.get("v");
              url = `https://youtube.com/embed/${id}`;
            }

            const path = ReactEditor.findPath(editor, element);
            const newProperties: Partial<CustomElement> = {
              url,
            };
            Transforms.setNodes<CustomElement>(editor, newProperties, {
              at: path,
            });
          }}
        />
      )}
    </div>
  );
}
