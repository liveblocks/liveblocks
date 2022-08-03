import React, { createRef, useEffect, useState } from "react";
import styles from "../../styles/BlockToolbar.module.css";
import Button from "../components/Button";

type Props = {
  alt: string | null;
  url: string | null;
  setAlt: (url: string) => void;
  setUrl: (url: string) => void;
  onClose: () => void;
};


export default function ImageToolbar({ alt, url, setAlt, setUrl, onClose }: Props) {
  const [altInputValue, setAltInputValue] = useState<string>(alt ? alt : "");
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
            setAlt(altInputValue);
            onClose();
          }}
        >
          <input
            type="url"
            title="Please enter a valid image link"
            ref={inputRef}
            className={styles.input}
            value={urlInputValue}
            onChange={(e) => setUrlInputValue(e.currentTarget.value)}
            placeholder="Paste image link…"
          />
          <input
            type="text"
            title="Add alt text"
            className={styles.input}
            value={altInputValue}
            onChange={(e) => setAltInputValue(e.currentTarget.value)}
            placeholder="Add alt text…"
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
