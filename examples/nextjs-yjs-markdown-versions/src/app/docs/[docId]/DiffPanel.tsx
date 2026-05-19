"use client";

import { DiffEditor } from "@monaco-editor/react";
import { useEffect, useState } from "react";
import type * as Y from "yjs";

import { getVersionText, type VersionInfo } from "@/lib/yjs-versions";
import { LocalTime } from "@/components/LocalTime";

import { PanelHeader, panelShellClass } from "./PanelChrome";

/**
 * Read-only Monaco DiffEditor that compares two versions side-by-side.
 *
 * Both sides are fed as plain-text snapshots of the corresponding `Y.Text`s
 * and re-read whenever those texts change (e.g. while the user types into
 * the editable RIGHT panel — this DiffEditor reflects the live diff).
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
  const original = useYTextString(yDoc, previousVersion?.id ?? null);
  const modified = useYTextString(yDoc, currentVersion.id);

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
          theme="vs-light"
          language="markdown"
          original={original}
          modified={modified}
          options={{
            readOnly: true,
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
