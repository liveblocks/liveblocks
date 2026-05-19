"use client";

import { DiffEditor } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import type { editor } from "monaco-editor";
import type * as Y from "yjs";

import { getVersionText, type VersionInfo } from "@/lib/yjs-versions";
import { LocalTime } from "@/components/LocalTime";
import type { ScrollSync } from "@/lib/scroll-sync";
import { useIsDark } from "@/lib/use-is-dark";

import { PanelHeader, panelShellClass } from "./PanelChrome";

/**
 * Read-only Monaco DiffEditor that compares two versions side-by-side.
 *
 * Both sides are fed as plain-text snapshots of the corresponding `Y.Text`s
 * and re-read whenever those texts change (e.g. while the user types into
 * the editable RIGHT panel — this DiffEditor reflects the live diff).
 *
 * Hooks the DiffEditor's modified-side editor into the shared `ScrollSync`
 * so it stays in lockstep with the plain editor on the right.
 */
export function DiffPanel({
  yDoc,
  previousVersion,
  currentVersion,
  versionIndex,
  sync,
}: {
  yDoc: Y.Doc;
  previousVersion: VersionInfo | null;
  currentVersion: VersionInfo;
  versionIndex: number;
  sync?: ScrollSync;
}) {
  const original = useYTextString(yDoc, previousVersion?.id ?? null);
  const modified = useYTextString(yDoc, currentVersion.id);
  const isDark = useIsDark();

  const modifiedEditorRef = useRef<editor.ICodeEditor | null>(null);

  const handleMount = (diffEditor: editor.IStandaloneDiffEditor) => {
    modifiedEditorRef.current = diffEditor.getModifiedEditor();
    sync?.setLeft(modifiedEditorRef.current);
  };

  useEffect(() => {
    return () => {
      sync?.setLeft(null);
      modifiedEditorRef.current = null;
    };
  }, [sync]);

  return (
    <div className={panelShellClass}>
      <PanelHeader
        label={`Diff · v${Math.max(versionIndex, 1)} ${
          previousVersion ? `vs v${versionIndex}` : "(first version)"
        }`}
        meta={<LocalTime date={currentVersion.createdAt} />}
      />
      <div className="relative min-h-0 flex-1">
        <DiffEditor
          height="100%"
          width="100%"
          theme={isDark ? "vs-dark" : "vs-light"}
          language="markdown"
          original={original}
          modified={modified}
          onMount={handleMount}
          options={{
            readOnly: true,
            originalEditable: false,
            renderSideBySide: true,
            renderOverviewRuler: false,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            minimap: { enabled: false },
            renderLineHighlight: "none",
            fontSize: 14,
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
