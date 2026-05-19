"use client";

import { Editor } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import type { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { MonacoBinding } from "y-monaco";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";

import { getVersionText, type VersionInfo } from "@/lib/yjs-versions";

import styles from "./Panels.module.css";

/**
 * A single-pane Monaco editor bound to a version's `Y.Text` via `y-monaco`.
 *
 * Only the latest version's panel is editable. Older panels are mounted in
 * read-only mode so users can review them while still seeing live cursors.
 */
export function EditorPanel({
  yDoc,
  provider,
  version,
  versionIndex,
  readOnly,
}: {
  yDoc: Y.Doc;
  provider: LiveblocksYjsProvider;
  version: VersionInfo;
  versionIndex: number;
  readOnly: boolean;
}) {
  const [editorRef, setEditorRef] = useState<editor.IStandaloneCodeEditor>();
  const bindingRef = useRef<MonacoBinding | null>(null);

  useEffect(() => {
    if (!editorRef) return;
    const model = editorRef.getModel();
    if (!model) return;

    const yText = getVersionText(yDoc, version.id);
    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editorRef]),
      provider.awareness as unknown as Awareness
    );
    bindingRef.current = binding;

    return () => {
      binding.destroy();
      bindingRef.current = null;
    };
  }, [editorRef, yDoc, provider, version.id]);

  return (
    <div className={styles.panel} data-readonly={readOnly}>
      <div className={styles.panelHeader}>
        <span className={styles.panelLabel}>
          {readOnly ? "Snapshot" : "Editor"} · v{versionIndex + 1}
        </span>
        <span className={styles.panelMeta}>
          {new Date(version.createdAt).toLocaleString()}
        </span>
      </div>
      <div className={styles.panelBody}>
        <Editor
          onMount={(e) => setEditorRef(e)}
          height="100%"
          width="100%"
          theme="vs-light"
          defaultLanguage="markdown"
          defaultValue=""
          options={{
            tabSize: 2,
            padding: { top: 16 },
            wordWrap: "on",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderLineHighlight: "none",
            readOnly,
            fontSize: 14,
          }}
        />
      </div>
    </div>
  );
}
