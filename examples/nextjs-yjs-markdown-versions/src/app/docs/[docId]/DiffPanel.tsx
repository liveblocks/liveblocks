"use client";

import { DiffEditor } from "@monaco-editor/react";
import { useEffect, useMemo, useRef } from "react";
import type { editor } from "monaco-editor";
import { MonacoBinding } from "y-monaco";
import type * as Y from "yjs";

import { getVersionText, type VersionInfo } from "@/lib/yjs-versions";
import { LocalTime } from "@/components/LocalTime";
import { registerMdx } from "@/lib/monaco-mdx";
import type { ScrollSync } from "@/lib/scroll-sync";
import { useIsDark } from "@/lib/use-is-dark";

import { PanelHeader, panelShellClass } from "./PanelChrome";

/**
 * Read-only Monaco DiffEditor that compares two versions side-by-side.
 *
 * The naive approach — feed the diff via `original` / `modified` props
 * and let `@monaco-editor/react` push the values onto Monaco's models —
 * causes a one-frame "no diff" flash on every keystroke. Internally
 * `@monaco-editor/react` reacts to prop changes by calling
 * `model.setValue(...)` which replaces the entire content and forces
 * Monaco to drop the existing diff decorations and recompute from
 * scratch, so the decorations are missing for one paint between the
 * value replace and the recomputation.
 *
 * Instead we set the initial values **once** (memoized on version IDs,
 * which are stable for this component instance), tell
 * `@monaco-editor/react` to keep the models with
 * `keepCurrentOriginalModel` / `keepCurrentModifiedModel`, and then —
 * inside `onMount` — bind the modified model directly to the live
 * `Y.Text` via `y-monaco`'s `MonacoBinding`. From then on, Yjs deltas
 * are applied to the model **incrementally**, so Monaco updates the
 * diff in-place and the decorations never disappear.
 *
 * The DiffEditor is still read-only — `MonacoBinding`'s built-in mutex
 * prevents loops, and we omit the awareness argument so the live
 * editor on the right is the sole owner of the local cursor.
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
  const isDark = useIsDark();

  // Stable initial values. Memoized on the version ids — these don't
  // change for the lifetime of this component instance because the
  // parent `EditorCarousel` keys the panel on `<previousId>-><focusedId>`,
  // so a new pair gets a fresh mount.
  const initialOriginal = useMemo(
    () =>
      previousVersion ? getVersionText(yDoc, previousVersion.id).toString() : "",
    [yDoc, previousVersion?.id]
  );
  const initialModified = useMemo(
    () => getVersionText(yDoc, currentVersion.id).toString(),
    [yDoc, currentVersion.id]
  );

  const modifiedEditorRef = useRef<editor.ICodeEditor | null>(null);
  const modifiedBindingRef = useRef<MonacoBinding | null>(null);

  const handleMount = (diffEditor: editor.IStandaloneDiffEditor) => {
    const modifiedEditor = diffEditor.getModifiedEditor();
    modifiedEditorRef.current = modifiedEditor;

    // Hide the modified side's gutter (line numbers, fold column, glyph
    // margin). The original side keeps its line numbers — that's the
    // meaningful one for a read-only diff — and the inner gutter was
    // just visual noise between the two panes.
    modifiedEditor.updateOptions({
      lineNumbers: "off",
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 0,
    });

    // Bind the modified model to the same Y.Text that the editable
    // editor on the right is writing to. Future user input flows from
    // there through Yjs and into this model as a delta — no
    // `setValue`, no flash.
    const modifiedModel = modifiedEditor.getModel();
    if (modifiedModel) {
      const yText = getVersionText(yDoc, currentVersion.id);
      modifiedBindingRef.current = new MonacoBinding(
        yText,
        modifiedModel,
        new Set([modifiedEditor])
        // No awareness — the editable RIGHT-panel editor owns the
        // local cursor; we don't want this read-only diff pane to
        // overwrite it.
      );
    }

    sync?.setLeft(modifiedEditor);
  };

  useEffect(() => {
    return () => {
      modifiedBindingRef.current?.destroy();
      modifiedBindingRef.current = null;
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
          beforeMount={registerMdx}
          height="100%"
          width="100%"
          theme={isDark ? "vs-dark" : "vs-light"}
          language="mdx"
          original={initialOriginal}
          modified={initialModified}
          keepCurrentOriginalModel
          keepCurrentModifiedModel
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
