import styles from "../../styles/BlockFigma.module.css";
import VideoIcon from "../icons/video.svg";
import { useState } from "react";
import BlockFigmaToolbar from "./BlockFigmaToolbar";
import { ReactEditor, useSlate } from "slate-react";
import { CustomElement, FigmaElement } from "./types";
import { Transforms } from "slate";
import Placeholder from "./Placeholder";

type Props = {
  element: FigmaElement;
};

export default function BlockFigma({ element }: Props) {
  const [showToolbar, setShowToolbar] = useState(false);
  const editor = useSlate();

  return (
    <div className={styles.block_figma}>
      {element.url ? (
        <div className={styles.figma_embed}>
          <iframe
            width="100%"
            height="315"
            src={element.url}
            title="Figma file"
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
          Embed Figma project here…
        </Placeholder>
      )}
      {showToolbar && (
        <BlockFigmaToolbar
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
