"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveblocksYjsProvider } from "@liveblocks/yjs";
import type * as Y from "yjs";

import type { VersionInfo } from "@/lib/yjs-versions";
import { ScrollSync } from "@/lib/scroll-sync";

import { DiffPanel } from "./DiffPanel";
import { EditorPanel } from "./EditorPanel";
import { PreviewPanel } from "./PreviewPanel";
import type { LeftPanelMode } from "./DocumentEditor";

/**
 * Two-panel carousel that performs a real horizontal slide whenever the
 * visible view changes:
 *
 *   - The previous view animates from `translateX(0)` to `translateX(-100%)`.
 *   - The new view animates from `translateX(100%)` to `translateX(0)`.
 *
 * The big subtlety is keeping the **previous** view's React tree alive
 * across the transition so its Monaco editor doesn't have to remount
 * (which would otherwise cause a one-frame flash of an empty pane at the
 * starting position of the slide).
 *
 * We do that with two tricks:
 *
 * 1. **Set up the transition during render.** Storing the
 *    `previousView` in `useEffect` / `useLayoutEffect` is too late —
 *    React has already committed the new render and unmounted the old
 *    view. Instead, we derive the transition state during render (the
 *    `if (incoming.key !== tracking.view.key) setTracking(...)` pattern
 *    is supported: React discards the in-progress render and re-runs
 *    with the new state, *before* committing anything to the DOM).
 *
 * 2. **Use the same React key across renders.** Both the previous and
 *    the current view are rendered as siblings using *their own*
 *    `view.key` — not a prefixed `in-…`/`out-…` form. React's reconciler
 *    matches children by key across renders even when their position in
 *    the JSX changes, so the previous view's DOM element (and its
 *    Monaco editor) is preserved. The only thing we change on it is its
 *    `className`, which kicks the `slideOutLeft` keyframe off on an
 *    already-mounted element.
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
  const incoming = buildView(versions, selectedIndex, leftMode);

  // The single source of truth for what's rendered. `view` is whatever
  // the user is currently "on"; `previousView` is non-null only while a
  // slide animation is in flight.
  const [tracking, setTracking] = useState<{
    view: View | null;
    previousView: View | null;
  }>(() => ({ view: incoming, previousView: null }));

  // Derive the transition during render. When `incoming` changes (the
  // user created a new version, navigated in the sidebar, toggled
  // Diff/Preview, …) we promote the previously-tracked view into
  // `previousView` and adopt the new one as `view`. React allows
  // setState during render — it discards the in-progress render and
  // re-runs with the updated state before committing anything, so the
  // old view's DOM element is never torn down between the two states.
  if ((incoming?.key ?? null) !== (tracking.view?.key ?? null)) {
    setTracking({ view: incoming, previousView: tracking.view });
  }

  const { view, previousView } = tracking;

  // One scroll-sync coordinator per document. Only the incoming view
  // registers its editors with it — the previous view is purely visual
  // while it slides off.
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

  if (!view) return null;

  const isTransitioning =
    previousView !== null && previousView.key !== view.key;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {isTransitioning ? (
        <div
          key={previousView!.key}
          className="animate-slideOutLeft absolute inset-0 will-change-transform"
          onAnimationEnd={() => {
            // Clear `previousView` only if it's still the one we just
            // animated out — a faster follow-up transition may have
            // already replaced it, in which case we leave the new one
            // alone.
            setTracking((prev) =>
              prev.previousView?.key === previousView!.key
                ? { ...prev, previousView: null }
                : prev
            );
          }}
        >
          <ViewPanels view={previousView!} yDoc={yDoc} provider={provider} />
        </div>
      ) : null}
      <div
        key={view.key}
        className={
          isTransitioning
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
