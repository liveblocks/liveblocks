"use client";

import { DiffEditor } from "@monaco-editor/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { editor } from "monaco-editor";
import type { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { MonacoBinding } from "y-monaco";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";

import { getVersionText, type VersionInfo } from "@/lib/yjs-versions";

import { PanelHeader, panelShellClass } from "./PanelChrome";

/**
 * Monaco DiffEditor that compares two versions side-by-side.
 *
 * The left (original) side is always read-only and is fed the predecessor
 * version's text as a string. The right (modified) side:
 *   - When `modifiedEditable` is true (i.e. this pair includes the latest
 *     version): we bind it to the live `Y.Text` via `y-monaco`'s
 *     `MonacoBinding`, so typing here is a real Yjs edit. The current
 *     version's text is stored back into Yjs.
 *   - Otherwise: a read-only snapshot, fed as a string.
 */
export function DiffPanel({
  yDoc,
  provider,
  previousVersion,
  currentVersion,
  versionIndex,
  modifiedEditable,
}: {
  yDoc: Y.Doc;
  provider: LiveblocksYjsProvider;
  previousVersion: VersionInfo | null;
  currentVersion: VersionInfo;
  versionIndex: number;
  modifiedEditable: boolean;
}) {
  const originalText = useYTextString(yDoc, previousVersion?.id ?? null);
  const readOnlyModifiedText = useYTextString(
    yDoc,
    modifiedEditable ? null : currentVersion.id
  );

  // When the modified side is editable we set its initial value once (from
  // the current Y.Text) and then let MonacoBinding own the model — passing
  // a reactively-updating `modified` prop would race with the binding.
  const initialModifiedText = useMemo(
    () => getVersionText(yDoc, currentVersion.id).toString(),
    [yDoc, currentVersion.id]
  );

  const bindingRef = useRef<MonacoBinding | null>(null);

  const handleMount = (diffEditor: editor.IStandaloneDiffEditor) => {
    if (!modifiedEditable) return;
    const modifiedEditor = diffEditor.getModifiedEditor();
    const model = modifiedEditor.getModel();
    if (!model) return;

    const yText = getVersionText(yDoc, currentVersion.id);
    bindingRef.current = new MonacoBinding(
      yText,
      model,
      new Set([modifiedEditor]),
      provider.awareness as unknown as Awareness
    );
  };

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [currentVersion.id, modifiedEditable]);

  const headerLabel = modifiedEditable
    ? `Editor · v${versionIndex + 1} (diff vs v${versionIndex})`
    : `Diff · v${versionIndex} → v${versionIndex + 1}`;

  return (
    <div className={panelShellClass}>
      <PanelHeader
        label={headerLabel}
        meta={new Date(currentVersion.createdAt).toLocaleString()}
      />
      <div className="relative min-h-0 flex-1">
        <DiffEditor
          height="100%"
          width="100%"
          theme="vs-light"
          language="markdown"
          original={originalText}
          modified={modifiedEditable ? initialModifiedText : readOnlyModifiedText}
          keepCurrentModifiedModel={modifiedEditable}
          onMount={handleMount}
          options={{
            readOnly: !modifiedEditable,
            originalEditable: false,
            renderSideBySide: true,
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

function useYTextString(yDoc: Y.Doc, versionId: string | null): string {
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
