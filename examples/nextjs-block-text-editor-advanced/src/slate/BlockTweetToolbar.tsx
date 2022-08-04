import React, { createRef, useEffect, useState } from "react";
import styles from "../../styles/BlockToolbar.module.css";
import Button from "../components/Button";

type Props = {
  url: string | null;
  setUrl: (url: string) => void;
  onClose: () => void;
};

const tweetLinkPattern = "^https:\\/\\/(?:[\\w\\.-]+\\.)?twitter\\.com\\/.*\\/status(?:es)?\\/([^\\/\\?]+)?$";
const tweetLinkRegex = new RegExp(tweetLinkPattern);

export default function TweetToolbar({ url, setUrl, onClose }: Props) {
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
            const match = urlInputValue.match(tweetLinkRegex);
            if (!match?.[1]) {
              setUrlInputValue("");
              return;
            }

            setUrl(match[1]);
            onClose();
          }}
        >
          <input
            type="url"
            title="Please enter a valid Tweet link"
            pattern={tweetLinkPattern}
            ref={inputRef}
            className={styles.input}
            value={urlInputValue}
            onChange={(e) => setUrlInputValue(e.currentTarget.value)}
            placeholder="Paste Tweet link…"
          />

          <Button
            appearance="primary"
            ariaLabel="Toggle Strikethrough"
            type="submit"
          >
            Embed Tweet
          </Button>
        </form>
      </div>
    </div>
  );
}
