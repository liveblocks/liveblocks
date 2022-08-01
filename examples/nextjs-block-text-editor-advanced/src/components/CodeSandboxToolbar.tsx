import React, { createRef, useEffect, useState } from "react";
import styles from "../../styles/VideoToolbar.module.css";
import Button from "./Button";

type Props = {
  url: string | null;
  setUrl: (url: string) => void;
  onClose: () => void;
};

const codeSandboxLinkPattern = "((?:https?:)?\/\/)?(?:www\\.)?(?:codesandbox\\.io)((\/s\/)|(\/embed\/))(.*)+$";
const codeSandboxLinkRegex = new RegExp(codeSandboxLinkPattern);

export default function CodeSandboxToolbar({ url, setUrl, onClose }: Props) {
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
            if (!codeSandboxLinkRegex.test(urlInputValue)) {
              setUrlInputValue("");
              return;
            }

            let embedLink;
            if (urlInputValue.includes("/embed/")) {
              embedLink = urlInputValue
            } else {
              embedLink = urlInputValue.replace("/s/", "/embed/");
            }

            setUrl(embedLink);
            onClose();
          }}
        >
          <input
            type="url"
            title="Please enter a valid CodeSandbox project link"
            pattern={codeSandboxLinkPattern}
            ref={inputRef}
            className={styles.url_input}
            value={urlInputValue}
            onChange={(e) => setUrlInputValue(e.currentTarget.value)}
            placeholder="Paste CodeSandbox link…"
          />

          <Button
            appearance="primary"
            ariaLabel="Toggle Strikethrough"
            type="submit"
          >
            Embed CodeSandbox
          </Button>
        </form>
      </div>
    </div>
  );
}
