import React, { createRef, useEffect, useState } from "react";
import styles from "../../styles/VideoToolbar.module.css";
import Button from "./Button";

type Props = {
  url: string | null;
  setUrl: (url: string) => void;
  onClose: () => void;
};

const youtubeLinkPattern = "^((?:https?:)?\/\/)?((?:www|m)\\.)?((?:youtube(-nocookie)?\\.com|youtu.be))(\/(?:[\\w\\-]+\\?v=|embed\/|v\/)?)([\\w\\-]+)(\\S+)?$";
const youtubeLinkRegex = new RegExp(youtubeLinkPattern);

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
            if (!youtubeLinkRegex.test(urlInputValue)) {
              setUrlInputValue("");
              return;
            }

            let embedLink;
            if (urlInputValue.includes("/embed/")) {
              embedLink = urlInputValue
            } else {
              const id = new URL(urlInputValue).searchParams.get("v");
              embedLink = `https://youtube.com/embed/${id}`;
            }

            setUrl(embedLink);
            onClose();
          }}
        >
          <input
            type="url"
            title="Please enter a valid YouTube link"
            pattern={youtubeLinkPattern}
            ref={inputRef}
            className={styles.url_input}
            value={urlInputValue}
            onChange={(e) => setUrlInputValue(e.currentTarget.value)}
            placeholder="Paste YouTube link…"
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
