import styles from "../../styles/BlockCodeSandbox.module.css";
import VideoIcon from "../icons/video.svg";
import { useState } from "react";
import BlockCodeSandboxToolbar from "./BlockCodeSandboxToolbar";
import { ReactEditor, useSlate } from "slate-react";
import { CustomElement, CodeSandboxElement } from "./types";
import { Transforms } from "slate";

type Props = {
  element: CodeSandboxElement;
};

export default function BlockCodeSandbox({ element }: Props) {
  const [showToolbar, setShowToolbar] = useState(false);
  const editor = useSlate();

  return (
    <div className={styles.block_codesandbox}>
      {element.url ? (
        <div className={styles.codesandbox_embed}>
          <iframe
            width="100%"
            height="315"
            src={element.url}
            title="CodeSandbox embed"
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
          <span className={styles.placeholder_text}>Embed CodeSandbox project here…</span>
        </button>
      )}
      {showToolbar && (
        <BlockCodeSandboxToolbar
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
