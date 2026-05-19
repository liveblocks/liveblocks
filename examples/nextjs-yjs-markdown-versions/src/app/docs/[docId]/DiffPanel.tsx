"use client";

import { DiffEditor } from "@monaco-editor/react";
import { useEffect, useState } from "react";
import type * as Y from "yjs";

import { getVersionText, type VersionInfo } from "@/lib/yjs-versions";

import { PanelHeader, panelShellClass } from "./PanelChrome";

/**
 * Read-only Monaco DiffEditor that compares a version to its predecessor.
 *
 * Subscribes to both `Y.Text`s and feeds their plain-text snapshots into the
 * DiffEditor as `original` and `modified`.
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
    <div className={panelShellClass}>
      <PanelHeader
        label={`Diff · v${Math.max(versionIndex, 1)} ${
          previousVersion ? `vs v${versionIndex}` : "(first version)"
        }`}
        meta={new Date(currentVersion.createdAt).toLocaleString()}
      />
      <div className="relative min-h-0 flex-1">
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
