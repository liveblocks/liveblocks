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
 * - When there is exactly one version (a brand-new document), we render a
 *   single editable Monaco editor at full width — there is nothing to diff
 *   against yet.
 * - With ≥ 2 versions:
 *     - LEFT  = read-only display of the version selected in the sidebar
 *               (either a plain Monaco editor or a rendered markdown preview,
 *               toggled by `leftMode`).
 *     - RIGHT = Monaco DiffEditor comparing the selected version to its
 *               successor. The modified (right) side is editable when the
 *               successor is the latest version, otherwise it is read-only.
 *
 * The "3 windows virtualization" is satisfied naturally: 1 plain Monaco
 * editor on the left + 1 Monaco DiffEditor (which renders 2 internal Monaco
 * editors) on the right = 3 Monaco editor instances mounted at any time.
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

  // selectedIndex picks the LEFT panel's version. The RIGHT panel always
  // shows the diff between selectedIndex and selectedIndex+1.
  const safeSelected = clamp(selectedIndex, 0, latestIndex - 1);
  const rightVersionIndex = safeSelected + 1;
  const leftVersion = versions[safeSelected];
  const rightVersion = versions[rightVersionIndex];
  const isLatestPair = rightVersionIndex === latestIndex;

  return (
    <div
      key={`${leftVersion.id}->${rightVersion.id}`}
      className="animate-slideInRight absolute inset-0 grid grid-cols-2"
    >
      <div className="min-w-0 p-3 pr-1.5">
        {leftMode === "preview" ? (
          <PreviewPanel
            yDoc={yDoc}
            version={leftVersion}
            versionIndex={safeSelected}
          />
        ) : (
          <EditorPanel
            yDoc={yDoc}
            provider={provider}
            version={leftVersion}
            versionIndex={safeSelected}
            readOnly={true}
            role="snapshot"
          />
        )}
      </div>
      <div className="min-w-0 p-3 pl-1.5">
        <DiffPanel
          yDoc={yDoc}
          provider={provider}
          previousVersion={leftVersion}
          currentVersion={rightVersion}
          versionIndex={rightVersionIndex}
          modifiedEditable={isLatestPair}
        />
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(max, n));
}
