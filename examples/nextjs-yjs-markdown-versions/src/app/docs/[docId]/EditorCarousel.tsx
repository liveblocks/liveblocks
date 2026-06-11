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

// How long the incoming view is held off-screen, fully mounted, before the
// slide starts. This is enough time for Monaco to (a) finish its initial
// paint of the new editors and (b) for its diff worker to return — so when
// the slide begins everything is already painted, diff and all.
const PRERENDER_MS = 100;

/**
 * Two-panel carousel. On every change to the visible "view" the carousel
 * slides by exactly **one column** (50% of the viewport):
 *
 *   - The outgoing pair animates from `translateX(0)` to `translateX(-50%)`,
 *     so its previously-LEFT column slides off-screen and its
 *     previously-RIGHT column (the editor the user was just typing into)
 *     lands in the LEFT slot.
 *   - The incoming pair animates from `translateX(50%)` to `translateX(0)`,
 *     so its LEFT column lands in the LEFT slot and its RIGHT column
 *     (the new editable editor) lands in the RIGHT slot.
 *
 * Three things had to come together for the transition to feel right:
 *
 * 1. **Set up the transition during render** so React discards the
 *    in-progress render before committing, preserving the previous
 *    view's DOM element (and therefore its Monaco editor instance).
 *
 * 2. **Use the same React key across renders** for the persisting
 *    element. The previous and current views are rendered as siblings
 *    using their own `view.key`; React matches by key across renders
 *    even when their position in the JSX changes, so the previous
 *    view's element is preserved when it becomes the outgoing view —
 *    only its `className` changes, which kicks `slideOutLeft` off on
 *    an already-mounted element.
 *
 * 3. **Prerender the incoming view at +50% offset**, behind the
 *    outgoing pair. We mount the new pair at `translate-x-1/2` for
 *    ~100 ms with no animation; its LEFT column sits behind the
 *    outgoing pair's RIGHT column (we z-index the outgoing pair on
 *    top), giving Monaco and the diff worker a chance to paint before
 *    anything visible moves. After that we flip to the animate phase
 *    and both layers slide by 50% in lockstep. When the outgoing pair
 *    unmounts at animation end, the incoming pair's LEFT column —
 *    already painted, diff and all — is revealed in the left slot.
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

  // Single tracking record. `phase` drives which classNames are applied
  // to the outgoing / incoming layers.
  const [tracking, setTracking] = useState<{
    view: View | null;
    previousView: View | null;
    phase: Phase;
  }>(() => ({ view: incoming, previousView: null, phase: "idle" }));

  // Derive the transition during render. When `incoming` changes we
  // promote the previously-tracked view into `previousView`, adopt the
  // new one as `view`, and enter `prerender`. React allows setState
  // during render — it discards the in-progress render and re-runs with
  // the new state before committing anything to the DOM, so the old
  // view's DOM element is never torn down between the two states.
  if ((incoming?.key ?? null) !== (tracking.view?.key ?? null)) {
    setTracking({
      view: incoming,
      previousView: tracking.view,
      phase: "prerender",
    });
  }

  const { view, previousView, phase } = tracking;

  // Move out of the prerender phase once Monaco has had time to paint
  // the new editors and compute the diff.
  useEffect(() => {
    if (phase !== "prerender") return;
    const id = setTimeout(() => {
      setTracking((prev) =>
        prev.phase === "prerender" ? { ...prev, phase: "animate" } : prev
      );
    }, PRERENDER_MS);
    return () => clearTimeout(id);
  }, [phase]);

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

  const hasOutgoing =
    previousView !== null && previousView.key !== view.key;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {hasOutgoing ? (
        <div
          key={previousView!.key}
          className={
            phase === "animate"
              ? "animate-slideOutLeft absolute inset-0 z-10 will-change-transform"
              : "absolute inset-0 z-10 will-change-transform"
          }
          onAnimationEnd={() => {
            // Clear `previousView` only if it's still the one we just
            // animated out — a fast follow-up transition may have
            // replaced it.
            setTracking((prev) =>
              prev.previousView?.key === previousView!.key
                ? { ...prev, previousView: null, phase: "idle" }
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
          phase === "prerender"
            ? "absolute inset-0 translate-x-1/2 will-change-transform"
            : phase === "animate"
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

type Phase = "idle" | "prerender" | "animate";

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
