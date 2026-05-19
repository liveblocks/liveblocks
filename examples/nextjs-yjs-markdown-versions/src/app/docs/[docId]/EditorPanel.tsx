"use client";

import { Editor } from "@monaco-editor/react";
import clsx from "clsx";
import type { editor } from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import type { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { MonacoBinding } from "y-monaco";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";

import { getVersionText, type VersionInfo } from "@/lib/yjs-versions";

import { PanelHeader, panelShellClass } from "./PanelChrome";

type Role = "single" | "snapshot";

/**
 * Single-pane Monaco editor bound to a version's `Y.Text` via `y-monaco`.
 *
 * Used in two places:
 *   - role="single":   the only editor for a brand-new document (1 version)
 *   - role="snapshot": the read-only LEFT panel showing the predecessor
 *                      version when the document has ≥ 2 versions
 */
export function EditorPanel({
  yDoc,
  provider,
  version,
  versionIndex,
  readOnly,
  role,
}: {
  yDoc: Y.Doc;
  provider: LiveblocksYjsProvider;
  version: VersionInfo;
  versionIndex: number;
  readOnly: boolean;
  role: Role;
}) {
  const [editorRef, setEditorRef] = useState<editor.IStandaloneCodeEditor>();
  const bindingRef = useRef<MonacoBinding | null>(null);

  useEffect(() => {
    if (!editorRef) return;
    const model = editorRef.getModel();
    if (!model) return;

    const yText = getVersionText(yDoc, version.id);
    bindingRef.current = new MonacoBinding(
      yText,
      model,
      new Set([editorRef]),
      provider.awareness as unknown as Awareness
    );

    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [editorRef, yDoc, provider, version.id]);

  const label =
    role === "snapshot"
      ? `Snapshot · v${versionIndex + 1}`
      : `Editor · v${versionIndex + 1}`;

  return (
    <div
      className={clsx(
        panelShellClass,
        readOnly && "bg-bg border-dashed"
      )}
    >
      <PanelHeader
        label={label}
        meta={new Date(version.createdAt).toLocaleString()}
      />
      <div className="relative min-h-0 flex-1">
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
