import styles from "../../styles/BlockCodeSandbox.module.css";
import CodeSandboxIcon from "../icons/codesandbox.svg";
import { useState } from "react";
import { ReactEditor, useSlate } from "slate-react";
import { CustomElement, CodeSandboxElement } from "./types";
import { Transforms } from "slate";
import Placeholder from "./Placeholder";

type Props = {
  element: CodeSandboxElement;
};

export default function BlockCodeSandbox({ element }: Props) {
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
        <Placeholder
          inputs={{
            url: {
              type: "url",
              icon: CodeSandboxIcon,
              placeholder: "Paste CodeSandbox link…",
              title: "Please enter a valid CodeSandbox project link",
              required: true,
              pattern: "((?:https?:)?//)?(?:www\.)?(?:codesandbox\.io)((/s/)|(/embed/))(.*)+$",
            },
          }}
          onSet={({ url }) => {
            if (!url.includes("/embed/")) {
              url = url.replace("/s/", "/embed/")
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
