import React, { createRef, useEffect, useState } from "react";
import styles from "../../styles/BlockToolbar.module.css";
import Button from "./Button";

type Props = {
  url: string | null;
  setUrl: (url: string) => void;
  onClose: () => void;
};


export default function ImageToolbar({ url, setUrl, onClose }: Props) {
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

            setUrl(urlInputValue);
            onClose();
          }}
        >
          <input
            type="url"
            title="Please enter a valid image link"
            ref={inputRef}
            className={styles.url_input}
            value={urlInputValue}
            onChange={(e) => setUrlInputValue(e.currentTarget.value)}
            placeholder="Paste image link…"
          />
          <Button
            appearance="primary"
            ariaLabel="Toggle Strikethrough"
            type="submit"
          >
            Embed image
          </Button>
        </form>
      </div>
    </div>
  );
}
