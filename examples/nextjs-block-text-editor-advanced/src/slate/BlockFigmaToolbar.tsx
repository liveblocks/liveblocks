import React, { createRef, useEffect, useState } from "react";
import styles from "../../styles/BlockToolbar.module.css";
import Button from "../components/Button";

type Props = {
  url: string | null;
  setUrl: (url: string) => void;
  onClose: () => void;
};

const figmaLinkPattern = "^https:\\/\\/([\\w\\.-]+\\.)?figma.com\\/(file|proto)\\/([0-9a-zA-Z]{22,128})(?:\\/.*)?$";
const figmaLinkRegex = new RegExp(figmaLinkPattern);

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
            if (!figmaLinkRegex.test(urlInputValue)) {
              setUrlInputValue("");
              return;
            }

            setUrl("https://www.figma.com/embed?embed_host=astra&url=" + urlInputValue);
            onClose();
          }}
        >
          <input
            type="url"
            title="Please enter a valid Figma project link"
            pattern={figmaLinkPattern}
            ref={inputRef}
            className={styles.input}
            value={urlInputValue}
            onChange={(e) => setUrlInputValue(e.currentTarget.value)}
            placeholder="Paste Figma link…"
          />

          <Button
            appearance="primary"
            ariaLabel="Toggle Strikethrough"
            type="submit"
          >
            Embed Figma file
          </Button>
        </form>
      </div>
    </div>
  );
}
