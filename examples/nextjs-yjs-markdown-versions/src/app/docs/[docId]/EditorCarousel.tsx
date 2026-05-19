"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LiveblocksYjsProvider } from "@liveblocks/yjs";
import type * as Y from "yjs";

import type { VersionInfo } from "@/lib/yjs-versions";
import { ScrollSync } from "@/lib/scroll-sync";

import { DiffPanel } from "./DiffPanel";
import { EditorPanel } from "./EditorPanel";
import { PreviewPanel } from "./PreviewPanel";
import type { LeftPanelMode } from "./DocumentEditor";

/**
 * Two-panel carousel. On every change to the visible "view" (e.g. the user
 * creates a new version, navigates with the sidebar, or toggles
 * Diff/Preview) the entire viewport literally slides:
 *
 *   - The previous view slides off-screen to the left  (`slideOutLeft`).
 *   - The new view slides in from the right            (`slideInRight`).
 *
 * Both are absolutely-positioned 100%-wide layers stacked inside an
 * `overflow:hidden` container, so the motion is a clean horizontal slide.
 * `useLayoutEffect` makes sure both animations start in the same paint —
 * otherwise the incoming would briefly animate without an outgoing
 * counterpart for one frame.
 *
 * The visible view is always one of:
 *
 *   - **single**: a brand-new document with exactly one version — one
 *     editable Monaco editor at full width, nothing to diff against.
 *   - **pair**:   LEFT panel = read-only Monaco DiffEditor (or markdown
 *     preview), RIGHT panel = plain Monaco editor for the focused
 *     version. Editable when that version is the latest.
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
  const view = buildView(versions, selectedIndex, leftMode);

  // One scroll-sync coordinator per document. Only the incoming view
  // registers its editors with it — the outgoing view is purely visual and
  // shouldn't fight the sync as it slides off.
  const syncRef = useRef<ScrollSync | null>(null);
  if (syncRef.current === null) {
    syncRef.current = new ScrollSync();
  }
  useEffect(() => {
    return () => {
      syncRef.current?.dispose();
      syncRef.current = null;
    };
  }, []);

  // Cross-fade-by-slide bookkeeping. Whenever the view key changes we
  // capture the just-previous view as `outgoing`, then clear it when its
  // slide-out animation finishes (or is replaced by another transition).
  const previousKeyRef = useRef<string | undefined>(view?.key);
  const previousViewRef = useRef<View | null>(view);
  const isFirstRenderRef = useRef(true);
  const [outgoing, setOutgoing] = useState<View | null>(null);

  useLayoutEffect(() => {
    if (!view) return;
    const isInitial = isFirstRenderRef.current;
    isFirstRenderRef.current = false;

    if (
      !isInitial &&
      previousKeyRef.current &&
      previousKeyRef.current !== view.key
    ) {
      setOutgoing(previousViewRef.current);
    }
    previousKeyRef.current = view.key;
    previousViewRef.current = view;
  }, [view?.key]);

  if (!view) return null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {outgoing ? (
        <div
          key={`out-${outgoing.key}`}
          className="animate-slideOutLeft absolute inset-0 will-change-transform"
          onAnimationEnd={() => setOutgoing(null)}
        >
          <ViewPanels view={outgoing} yDoc={yDoc} provider={provider} />
        </div>
      ) : null}
      <div
        key={`in-${view.key}`}
        className={
          outgoing
            ? "animate-slideInRight absolute inset-0 will-change-transform"
            : "absolute inset-0"
        }
      >
        <ViewPanels
          view={view}
          yDoc={yDoc}
          provider={provider}
          sync={syncRef.current!}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

type SingleView = {
  kind: "single";
  key: string;
  version: VersionInfo;
};

type PairView = {
  kind: "pair";
  key: string;
  previousVersion: VersionInfo | null;
  focusedVersion: VersionInfo;
  focusedIndex: number;
  isLatest: boolean;
  leftMode: LeftPanelMode;
};

type View = SingleView | PairView;

function buildView(
  versions: VersionInfo[],
  selectedIndex: number,
  leftMode: LeftPanelMode
): View | null {
  if (versions.length === 0) return null;

  if (versions.length === 1) {
    return {
      kind: "single",
      key: `s-${versions[0].id}`,
      version: versions[0],
    };
  }

  const latestIndex = versions.length - 1;
  const focusedIndex = Math.max(0, Math.min(selectedIndex, latestIndex));
  const focusedVersion = versions[focusedIndex];
  const previousVersion = focusedIndex > 0 ? versions[focusedIndex - 1] : null;
  const isLatest = focusedIndex === latestIndex;

  return {
    kind: "pair",
    key: `p-${previousVersion?.id ?? "_"}-${focusedVersion.id}-${
      isLatest ? "e" : "r"
    }-${leftMode}`,
    previousVersion,
    focusedVersion,
    focusedIndex,
    isLatest,
    leftMode,
  };
}

function ViewPanels({
  view,
  yDoc,
  provider,
  sync,
}: {
  view: View;
  yDoc: Y.Doc;
  provider: LiveblocksYjsProvider;
  sync?: ScrollSync;
}) {
  if (view.kind === "single") {
    return (
      <div className="absolute inset-0 p-3">
        <EditorPanel
          yDoc={yDoc}
          provider={provider}
          version={view.version}
          versionIndex={0}
          readOnly={false}
          role="single"
          sync={sync}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 grid grid-cols-2">
      <div className="min-w-0 p-3 pr-1.5">
        {view.leftMode === "preview" ? (
          <PreviewPanel
            yDoc={yDoc}
            version={view.focusedVersion}
            versionIndex={view.focusedIndex}
          />
        ) : (
          <DiffPanel
            yDoc={yDoc}
            previousVersion={view.previousVersion}
            currentVersion={view.focusedVersion}
            versionIndex={view.focusedIndex}
            sync={sync}
          />
        )}
      </div>
      <div className="min-w-0 p-3 pl-1.5">
        <EditorPanel
          yDoc={yDoc}
          provider={provider}
          version={view.focusedVersion}
          versionIndex={view.focusedIndex}
          readOnly={!view.isLatest}
          role={view.isLatest ? "current" : "snapshot"}
          sync={sync}
        />
      </div>
    </div>
  );
}
