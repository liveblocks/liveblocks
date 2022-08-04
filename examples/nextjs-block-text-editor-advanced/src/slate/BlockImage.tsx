import styles from "../../styles/BlockImage.module.css";
import ImageIcon from "../icons/image.svg";
import { useState } from "react";
import BlockImageToolbar from "./BlockImageToolbar";
import { ReactEditor, useSlate } from "slate-react";
import { CustomElement, ImageElement } from "./types";
import { Transforms } from "slate";
import Placeholder from "./Placeholder";

type Props = {
  element: ImageElement;
};

export default function BlockImage({ element }: Props) {
  const [showToolbar, setShowToolbar] = useState(false);
  const editor = useSlate();

  return (
    <div className={styles.block_image}>
      {element.url ? (
        <div className={styles.image_embed}>
          <img src={element.url} alt={element.alt || ""} />
        </div>
      ) : (
        <Placeholder
          onClick={() => setShowToolbar(true)}
          icon={ImageIcon}
        >
          Embed image here…
        </Placeholder>
      )}
      {showToolbar && (
        <BlockImageToolbar
          alt={element.alt}
          url={element.url}
          setAlt={(alt) => {
            const path = ReactEditor.findPath(editor, element);
            const newProperties: Partial<CustomElement> = {
              alt,
            };
            Transforms.setNodes<CustomElement>(editor, newProperties, {
              at: path,
            });
          }}
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
