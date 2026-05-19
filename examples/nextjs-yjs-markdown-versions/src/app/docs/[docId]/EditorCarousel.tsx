"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LiveblocksYjsProvider } from "@liveblocks/yjs";
import type * as Y from "yjs";

import type { VersionInfo } from "@/lib/yjs-versions";

import type { LeftPanelMode } from "./DocumentEditor";
import { DiffPanel } from "./DiffPanel";
import { EditorPanel } from "./EditorPanel";
import { PreviewPanel } from "./PreviewPanel";
import styles from "./EditorCarousel.module.css";

const PANEL_WIDTH_PERCENT = 50; // each panel = 50% of viewport
const TRANSITION_MS = 320;

/**
 * Smooth horizontal carousel of version panels.
 *
 * The "tape" lays panels out in absolute positions (one per version) but only
 * the panels close to the current viewport (3 in steady state, up to ~5
 * during an animation) are actually mounted. The tape's `translateX` animates
 * whenever `selectedIndex` changes — that gives the "infinite carousel" feel.
 *
 * Visible viewport = panels [selectedIndex, selectedIndex + 1]:
 *   - left panel  (`selectedIndex`):     diff vs predecessor OR markdown preview
 *   - right panel (`selectedIndex + 1`): live Monaco editor (read-only unless
 *                                        this is the very latest version)
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

  // Special case: when there's a single version, just show the editor at full
  // width. There's nothing to diff against.
  if (versions.length === 1) {
    return (
      <div className={styles.viewport}>
        <div className={styles.singleSlot}>
          <EditorPanel
            yDoc={yDoc}
            provider={provider}
            version={versions[0]}
            versionIndex={0}
            readOnly={false}
          />
        </div>
      </div>
    );
  }

  const safeSelected = clamp(selectedIndex, 0, latestIndex - 1);
  const rightIndex = safeSelected + 1;

  return (
    <Tape
      yDoc={yDoc}
      provider={provider}
      versions={versions}
      latestIndex={latestIndex}
      safeSelected={safeSelected}
      rightIndex={rightIndex}
      leftMode={leftMode}
    />
  );
}

function Tape({
  yDoc,
  provider,
  versions,
  latestIndex,
  safeSelected,
  rightIndex,
  leftMode,
}: {
  yDoc: Y.Doc;
  provider: LiveblocksYjsProvider;
  versions: VersionInfo[];
  latestIndex: number;
  safeSelected: number;
  rightIndex: number;
  leftMode: LeftPanelMode;
}) {
  // Maintain the window of mounted panels. In steady state we keep three
  // (left neighbor, current left, current right). Around a transition we
  // union the previous and the new window so panels animating off-screen
  // remain mounted for the duration of the transition.
  const [mounted, setMounted] = useState<number[]>(() =>
    neighborWindow(safeSelected, latestIndex)
  );
  const prevSelectedRef = useRef(safeSelected);

  useEffect(() => {
    const prev = prevSelectedRef.current;
    prevSelectedRef.current = safeSelected;

    const wide = new Set<number>([
      ...neighborWindow(prev, latestIndex),
      ...neighborWindow(safeSelected, latestIndex),
    ]);
    setMounted(Array.from(wide).sort((a, b) => a - b));

    const timer = setTimeout(() => {
      setMounted(neighborWindow(safeSelected, latestIndex));
    }, TRANSITION_MS + 50);
    return () => clearTimeout(timer);
  }, [safeSelected, latestIndex]);

  const tapeTransform = useMemo(
    () => `translateX(${-safeSelected * PANEL_WIDTH_PERCENT}%)`,
    [safeSelected]
  );

  const tapeWidth = `${(latestIndex + 2) * PANEL_WIDTH_PERCENT}%`;

  return (
    <div className={styles.viewport}>
      <div
        className={styles.tape}
        style={{
          width: tapeWidth,
          transform: tapeTransform,
          transitionDuration: `${TRANSITION_MS}ms`,
        }}
      >
        {mounted.map((versionIndex) => {
          const version = versions[versionIndex];
          if (!version) return null;
          const isLeftSlot = versionIndex === safeSelected;
          const isRightSlot = versionIndex === rightIndex;
          const isLatest = versionIndex === latestIndex;

          return (
            <div
              key={version.id}
              className={styles.slot}
              style={{
                left: `${versionIndex * PANEL_WIDTH_PERCENT}%`,
                width: `${PANEL_WIDTH_PERCENT}%`,
              }}
              data-role={
                isLeftSlot ? "left" : isRightSlot ? "right" : "offscreen"
              }
              aria-hidden={!isLeftSlot && !isRightSlot}
            >
              {isLeftSlot ? (
                <LeftSlot
                  yDoc={yDoc}
                  versions={versions}
                  versionIndex={versionIndex}
                  leftMode={leftMode}
                />
              ) : (
                <EditorPanel
                  yDoc={yDoc}
                  provider={provider}
                  version={version}
                  versionIndex={versionIndex}
                  readOnly={!isLatest}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeftSlot({
  yDoc,
  versions,
  versionIndex,
  leftMode,
}: {
  yDoc: Y.Doc;
  versions: VersionInfo[];
  versionIndex: number;
  leftMode: LeftPanelMode;
}) {
  const version = versions[versionIndex];
  if (leftMode === "preview") {
    return (
      <PreviewPanel yDoc={yDoc} version={version} versionIndex={versionIndex} />
    );
  }
  const previous = versionIndex > 0 ? versions[versionIndex - 1] : null;
  return (
    <DiffPanel
      yDoc={yDoc}
      previousVersion={previous}
      currentVersion={version}
      versionIndex={versionIndex}
    />
  );
}

function clamp(n: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(max, n));
}

function neighborWindow(center: number, max: number): number[] {
  const window: number[] = [];
  for (let i = center - 1; i <= center + 2; i++) {
    if (i >= 0 && i <= max) window.push(i);
  }
  return window;
}
