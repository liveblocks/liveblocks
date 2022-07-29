import React, { createRef, useEffect, useState } from "react";
import styles from "../../styles/VideoToolbar.module.css";
import { BlockNodeType } from "../types";
import Button from "./Button";

type Props = {
  url: string | null;
  setUrl: (url: string) => void;
  onClose: () => void;
};

export default function VideoToolbar({ url, setUrl, onClose }: Props) {
  const [urlInputValue, setUrlInputValue] = useState<string>(url ? url : "");
  const inputRef = createRef<HTMLInputElement>();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className={styles.toolbar_container}>
      <div className={styles.toolbar_outside} onClick={onClose} />
      <div className={styles.toolbar}>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            const regex =
              /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;
            if (!regex.test(urlInputValue)) {
              setUrlInputValue("");
              return;
            }
            setUrl(urlInputValue);
            onClose();
          }}
        >
          <input
            type="url"
            ref={inputRef}
            className={styles.url_input}
            value={urlInputValue}
            onChange={(e) => setUrlInputValue(e.currentTarget.value)}
            placeholder="Paste the YouTube video link…"
          />

          <Button
            appearance="primary"
            ariaLabel="Toggle Strikethrough"
            type="submit"
          >
            Embed video
          </Button>
        </form>
      </div>
    </div>
  );
}

const getBlockNodeTypeFromTag = (tag: string) => {
  switch (tag) {
    case "h1":
      return BlockNodeType.HeadingOne;
    case "h2":
      return BlockNodeType.HeadingTwo;
    case "h3":
      return BlockNodeType.HeadingThree;
    default:
      return BlockNodeType.Paragraph;
  }
};
