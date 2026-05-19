"use client";

import { Editor } from "@monaco-editor/react";
import clsx from "clsx";
import { KeyCode, KeyMod, type editor } from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import type { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { MonacoBinding } from "y-monaco";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";

import { getVersionText, type VersionInfo } from "@/lib/yjs-versions";
import { LocalTime } from "@/components/LocalTime";
import { formatMarkdown } from "@/lib/format";
import { registerMdx } from "@/lib/monaco-mdx";
import type { ScrollSync } from "@/lib/scroll-sync";
import { useIsDark } from "@/lib/use-is-dark";

import { PanelHeader, panelShellClass } from "./PanelChrome";

type Role = "single" | "current" | "snapshot";

/**
 * Single-pane Monaco editor bound to a version's `Y.Text` via `y-monaco`.
 *
 * When the editor is editable we register Prettier on:
 *   - Cmd/Ctrl + S
 *   - Cmd/Ctrl + Shift + P
 */
export function EditorPanel({
  yDoc,
  provider,
  version,
  versionIndex,
  readOnly,
  role,
  sync,
}: {
  yDoc: Y.Doc;
  provider: LiveblocksYjsProvider;
  version: VersionInfo;
  versionIndex: number;
  readOnly: boolean;
  role: Role;
  sync?: ScrollSync;
}) {
  const [editorRef, setEditorRef] = useState<editor.IStandaloneCodeEditor>();
  const bindingRef = useRef<MonacoBinding | null>(null);
  const isDark = useIsDark();

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

  useEffect(() => {
    if (!sync) return;
    sync.setRight(editorRef ?? null);
    return () => {
      sync.setRight(null);
    };
  }, [sync, editorRef]);

  useEffect(() => {
    if (!editorRef || readOnly) return;

    const format = async () => {
      const model = editorRef.getModel();
      if (!model) return;
      const current = model.getValue();
      try {
        const formatted = await formatMarkdown(current);
        if (formatted === current) return;
        editorRef.executeEdits("prettier", [
          {
            range: model.getFullModelRange(),
            text: formatted,
            forceMoveMarkers: true,
          },
        ]);
      } catch (err) {
        console.warn("[markdown-versions] prettier:", err);
      }
    };

    const disposers = [
      editorRef.addAction({
        id: "format-mdx-save",
        label: "Format MDX (Prettier)",
        keybindings: [KeyMod.CtrlCmd | KeyCode.KeyS],
        run: format,
      }),
      editorRef.addAction({
        id: "format-mdx-palette",
        label: "Format MDX (Prettier)",
        keybindings: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyP],
        run: format,
      }),
    ];

    return () => {
      disposers.forEach((d) => d?.dispose?.());
    };
  }, [editorRef, readOnly]);

  const label =
    role === "snapshot"
      ? `Snapshot · v${versionIndex + 1}`
      : `Editor · v${versionIndex + 1}`;

  return (
    <div className={clsx(panelShellClass, readOnly && "bg-bg border-dashed")}>
      <PanelHeader label={label} meta={<LocalTime date={version.createdAt} />} />
      <div className="relative min-h-0 flex-1">
        <Editor
          beforeMount={registerMdx}
          onMount={(e) => setEditorRef(e)}
          height="100%"
          width="100%"
          theme={isDark ? "vs-dark" : "vs-light"}
          defaultLanguage="mdx"
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
