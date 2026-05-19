"use client";

import { DiffEditor } from "@monaco-editor/react";
import { useEffect, useState } from "react";
import type * as Y from "yjs";

import { getVersionText, type VersionInfo } from "@/lib/yjs-versions";

import styles from "./Panels.module.css";

/**
 * Read-only Monaco DiffEditor that compares a version to its predecessor.
 *
 * Subscribes to both `Y.Text`s and feeds their plain-text snapshots into the
 * DiffEditor as `original` and `modified`. This is sufficient for an example —
 * a production app might use Liveblocks AI Editor's `useDiff` hook or maintain
 * its own diff state via Yjs `applyUpdate` history.
 */
export function DiffPanel({
  yDoc,
  previousVersion,
  currentVersion,
  versionIndex,
}: {
  yDoc: Y.Doc;
  previousVersion: VersionInfo | null;
  currentVersion: VersionInfo;
  versionIndex: number;
}) {
  const original = useYTextContents(yDoc, previousVersion?.id ?? null);
  const modified = useYTextContents(yDoc, currentVersion.id);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelLabel}>
          Diff · v{Math.max(versionIndex, 1)}{" "}
          {previousVersion ? `vs v${versionIndex}` : "(first version)"}
        </span>
        <span className={styles.panelMeta}>
          {new Date(currentVersion.createdAt).toLocaleString()}
        </span>
      </div>
      <div className={styles.panelBody}>
        <DiffEditor
          height="100%"
          width="100%"
          theme="vs-light"
          language="markdown"
          original={original}
          modified={modified}
          options={{
            readOnly: true,
            renderSideBySide: true,
            originalEditable: false,
            renderOverviewRuler: false,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            minimap: { enabled: false },
            renderLineHighlight: "none",
            fontSize: 13,
            padding: { top: 16 },
          }}
        />
      </div>
    </div>
  );
}

function useYTextContents(yDoc: Y.Doc, versionId: string | null): string {
  const [text, setText] = useState<string>(() =>
    versionId ? getVersionText(yDoc, versionId).toString() : ""
  );

  useEffect(() => {
    if (!versionId) {
      setText("");
      return;
    }
    const yText = getVersionText(yDoc, versionId);
    const update = () => setText(yText.toString());
    update();
    yText.observe(update);
    return () => yText.unobserve(update);
  }, [yDoc, versionId]);

  return text;
}
