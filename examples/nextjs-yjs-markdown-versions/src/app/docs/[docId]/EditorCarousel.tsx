"use client";

import type { LiveblocksYjsProvider } from "@liveblocks/yjs";
import type * as Y from "yjs";

import type { VersionInfo } from "@/lib/yjs-versions";

import { DiffPanel } from "./DiffPanel";
import { EditorPanel } from "./EditorPanel";
import { PreviewPanel } from "./PreviewPanel";
import type { LeftPanelMode } from "./DocumentEditor";

/**
 * Two-panel layout for the markdown document.
 *
 *   - When there is exactly one version (a brand-new document) we render a
 *     single editable Monaco editor at full width — there is nothing to
 *     diff against yet.
 *   - With ≥ 2 versions:
 *       LEFT  = read-only Monaco DiffEditor comparing the predecessor to
 *               the focused version (or a rendered markdown preview, when
 *               the user toggles "Preview").
 *       RIGHT = plain Monaco editor for the focused version, bound to its
 *               `Y.Text` via `y-monaco`. Editable when the focused version
 *               is the latest; read-only when the user has navigated to
 *               an older snapshot.
 *
 * 3 Monaco editor instances are mounted at any time: 1 DiffEditor (with 2
 * internal editors) on the left + 1 plain Monaco editor on the right.
 */
export function EditorCarousel({
  yDoc,
  provider,
  versions,
  selectedIndex,
  leftMode,
}: {
  yDoc: Y.Doc;
  provider: LiveblocksYjsProvider;
  versions: VersionInfo[];
  selectedIndex: number;
  leftMode: LeftPanelMode;
}) {
  const latestIndex = versions.length - 1;

  if (versions.length === 0) return null;

  if (versions.length === 1) {
    return (
      <div className="absolute inset-0 p-3">
        <EditorPanel
          yDoc={yDoc}
          provider={provider}
          version={versions[0]}
          versionIndex={0}
          readOnly={false}
          role="single"
        />
      </div>
    );
  }

  // `selectedIndex` is the focused (RIGHT-panel) version. The LEFT panel
  // shows its predecessor (or "(first version)" when there is none).
  const focusedIndex = clamp(selectedIndex, 0, latestIndex);
  const previousIndex = focusedIndex - 1;
  const focusedVersion = versions[focusedIndex];
  const previousVersion =
    previousIndex >= 0 ? versions[previousIndex] : null;
  const isLatest = focusedIndex === latestIndex;

  return (
    <div
      key={`${previousVersion?.id ?? "_"}->${focusedVersion.id}-${
        isLatest ? "e" : "r"
      }`}
      className="animate-slideInRight absolute inset-0 grid grid-cols-2"
    >
      <div className="min-w-0 p-3 pr-1.5">
        {leftMode === "preview" ? (
          <PreviewPanel
            yDoc={yDoc}
            version={focusedVersion}
            versionIndex={focusedIndex}
          />
        ) : (
          <DiffPanel
            yDoc={yDoc}
            previousVersion={previousVersion}
            currentVersion={focusedVersion}
            versionIndex={focusedIndex}
          />
        )}
      </div>
      <div className="min-w-0 p-3 pl-1.5">
        <EditorPanel
          yDoc={yDoc}
          provider={provider}
          version={focusedVersion}
          versionIndex={focusedIndex}
          readOnly={!isLatest}
          role={isLatest ? "current" : "snapshot"}
        />
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(max, n));
}
