"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type * as Y from "yjs";

import { getVersionText, type VersionInfo } from "@/lib/yjs-versions";

import styles from "./Panels.module.css";

export function PreviewPanel({
  yDoc,
  version,
  versionIndex,
}: {
  yDoc: Y.Doc;
  version: VersionInfo;
  versionIndex: number;
}) {
  const [text, setText] = useState<string>(() =>
    getVersionText(yDoc, version.id).toString()
  );

  useEffect(() => {
    const yText = getVersionText(yDoc, version.id);
    const update = () => setText(yText.toString());
    update();
    yText.observe(update);
    return () => yText.unobserve(update);
  }, [yDoc, version.id]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelLabel}>Preview · v{versionIndex + 1}</span>
        <span className={styles.panelMeta}>
          {new Date(version.createdAt).toLocaleString()}
        </span>
      </div>
      <div className={styles.previewBody}>
        {text.trim().length === 0 ? (
          <p className={styles.previewEmpty}>
            <em>This version is empty.</em>
          </p>
        ) : (
          <article className={styles.markdown}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}
