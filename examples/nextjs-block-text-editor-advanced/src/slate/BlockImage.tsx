import styles from "../../styles/BlockImage.module.css";
import ImageIcon from "../icons/image.svg";
import { ReactEditor, useSlate } from "slate-react";
import { CustomElement, ImageElement } from "./types";
import { Transforms } from "slate";
import Placeholder from "./Placeholder";
import { useSelf } from "./liveblocks.config";

type Props = {
  element: ImageElement;
};

export default function BlockImage({ element }: Props) {
  const editor = useSlate();
  const self = useSelf();

  return (
    <div className={styles.block_image}>
      {element.url ? (
        <div className={styles.image_embed}>
          <img src={element.url} alt={element.alt || ""} />
        </div>
      ) : (
        <Placeholder
          startOpen={self?.connectionId === element.createdBy}
          icon={ImageIcon}
          text="Embed an image from a URL"
          inputs={{
            url: {
              type: "url",
              icon: ImageIcon,
              placeholder: "Paste image link",
              title: "Please enter a valid image link",
              required: true,
            },
            alt: {
              type: "text",
              icon: ImageIcon,
              placeholder: "Enter alt text",
              required: false,
            }
          }}
          onSet={({ url, alt }) => {
            const path = ReactEditor.findPath(editor, element);
            const newProperties: Partial<CustomElement> = {
              url,
              alt,
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
