import styles from "./BlockFigma.module.css";
import FigmaIcon from "../icons/figma.svg";
import { ReactEditor, useSlate } from "slate-react";
import { CustomElement, FigmaElement } from "../types";
import { Transforms } from "slate";
import Placeholder from "../components/Placeholder";
import { useSelf } from "../liveblocks.config";

type Props = {
  element: FigmaElement;
};

export default function BlockFigma({ element }: Props) {
  const editor = useSlate();
  const self = useSelf();

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
          defaultOpen={self?.connectionId === element?.createdBy}
          icon={FigmaIcon}
          text="Embed a Figma project"
          inputs={{
            url: {
              type: "url",
              label: "URL",
              placeholder: "Paste Figma project link…",
              title: "Please enter a valid Figma project link",
              required: true,
              pattern:
                "^https:\\/\\/([\\w\\.-]+\\.)?figma.com\\/(file|proto)\\/([0-9a-zA-Z]{22,128})(?:\\/.*)?$",
            },
          }}
          onSubmit={({ url }) => {
            url = "https://www.figma.com/embed?embed_host=astra&url=" + url;

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
